;(function () {
  'use strict'

  activateSearch(require('docsearch.js/dist/cdn/docsearch.js'), document.getElementById('search-script').dataset)

  var CTRL_KEY = 17
  var S_KEY = 83
  var SOLIDUS_KEY = 191

  function activateSearch (docsearch, config) {
    appendStylesheet(config.stylesheet)
    var algoliaOptions = {
      hitsPerPage: parseInt(config.maxResults) || 15,
      advancedSyntax: true,
      advancedSyntaxFeatures: ['exactPhrase'],
    }
    var searchFieldSelector = '#' + (config.searchFieldId || 'search')
    var searchField = document.querySelector(searchFieldSelector)
    var filterInput = searchField.querySelector('.filter input')
    var controller = docsearch({
      appId: config.appId,
      apiKey: config.apiKey,
      indexName: config.indexName,
      inputSelector: searchFieldSelector + ' .query',
      autocompleteOptions: { autoselect: false, debug: true, hint: false, keyboardShortcuts: [], minLength: 2 },
      algoliaOptions: algoliaOptions,
      transformData: protectHitOrder,
      queryHook:
        filterInput &&
        function (query) {
          controller.algoliaOptions = filterInput.checked
            ? Object.assign({}, algoliaOptions, { facetFilters: [filterInput.dataset.facetFilter] })
            : algoliaOptions
        },
    })
    var input = controller.input
    var autocomplete = input.autocomplete
    var typeahead = input.data('aaAutocomplete')
    autocomplete.setVal()
    input.on('autocomplete:selected', disableClose)
    input.on('autocomplete:updated', resetScroll.bind(autocomplete.getWrapper().firstChild))
    typeahead.dropdown._ensureVisible = ensureVisible
    if (filterInput) filterInput.addEventListener('change', toggleFilter.bind(typeahead))
    monitorCtrlKey(input, typeahead.dropdown.$menu)
    searchField.addEventListener('click', confineEvent)
    document.documentElement.addEventListener('click', resetSearch.bind(autocomplete))
    document.addEventListener('keydown', handleShortcuts.bind(input))
    if (input.attr('autofocus') != null) input.focus()
  }

  function appendStylesheet (href) {
    document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: href }))
  }

  function resetScroll () {
    this.scrollTop = 0
  }

  function toggleFilter () {
    var input = this.$input
    var dropdown = this.dropdown
    input.focus()
    if (!dropdown.isOpen || !input.val()) return
    dropdown.datasets[0].clearCachedSuggestions()
    dropdown.update(input.val())
  }

  function confineEvent (e) {
    e.stopPropagation()
  }

  function disableClose (e) {
    e.isDefaultPrevented = function () {
      return true
    }
  }

  function ensureVisible (el) {
    var item = el.get(0)
    var container = item
    while ((container = container.parentNode) && container !== document.documentElement) {
      if (window.getComputedStyle(container).overflowY === 'auto') break
    }
    if (!container || container.scrollHeight === container.offsetHeight) return
    var delta
    if ((delta = 15 + item.offsetTop + item.offsetHeight - (container.offsetHeight + container.scrollTop)) > 0) {
      container.scrollTop += delta
    }
    if ((delta = item.offsetTop - container.scrollTop) < 0) {
      container.scrollTop += delta
    }
  }

  function handleShortcuts (e) {
    var target = e.target || {}
    if (e.altKey || e.shiftKey || target.isContentEditable || 'disabled' in target) return
    if (e.ctrlKey ? e.keyCode === SOLIDUS_KEY : e.keyCode === S_KEY) {
      this.focus()
      e.preventDefault()
      e.stopPropagation()
    }
  }

  function monitorCtrlKey (input, dropdown) {
    input.on('keydown', onCtrlKeyDown.bind(dropdown))
    dropdown.on('keyup', onCtrlKeyUp.bind(input))
  }

  function onCtrlKeyDown (e) {
    if (e.keyCode === CTRL_KEY) this.find('.ds-cursor a').focus()
  }

  function onCtrlKeyUp (e) {
    if (e.keyCode === CTRL_KEY) this.focus()
  }

  function resetSearch () {
    this.close()
    this.setVal()
  }

  // preserves the original order of results by qualifying unique occurrences of the same lvl0 and lvl1 values
  function protectHitOrder (hits) {
    var prevLvl0
    var lvl0Qualifiers = {}
    var lvl1Qualifiers = {}
    return hits.map(function (hit) {
      var lvl0 = hit.hierarchy.lvl0
      var lvl0Qualifier = lvl0Qualifiers[lvl0]
      if (lvl0 !== prevLvl0) {
        lvl0Qualifiers[lvl0] = lvl0Qualifier == null ? (lvl0Qualifier = '') : (lvl0Qualifier += ' ')
        lvl1Qualifiers = {}
      }
      if (lvl0Qualifier) hit.hierarchy.lvl0 = lvl0 + lvl0Qualifier
      var lvl1 = hit.hierarchy.lvl1
      if (lvl1 in lvl1Qualifiers) {
        hit.hierarchy.lvl1 = lvl1 + (lvl1Qualifiers[lvl1] += ' ')
      } else {
        lvl1Qualifiers[lvl1] = ''
      }
      prevLvl0 = lvl0
      return hit
    })
  }
})()
