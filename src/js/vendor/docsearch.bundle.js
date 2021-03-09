;(function () {
  'use strict'

  var CTRL_KEY_CODE = 17
  var S_KEY_CODE = 83
  var SOLIDUS_KEY_CODE = 191
  var SEARCH_FILTER_ACTIVE_KEY = 'docs:search-filter-active'

  activateSearch(require('docsearch.js/dist/cdn/docsearch.js'), document.getElementById('search-script').dataset)

  function activateSearch (docsearch, config) {
    appendStylesheet(config.stylesheet)
    var algoliaOptions = {
      hitsPerPage: parseInt(config.maxResults) || 15,
      advancedSyntax: true,
      advancedSyntaxFeatures: ['exactPhrase'],
    }
    var searchField = document.getElementById(config.searchFieldId || 'search')
    var controller = docsearch({
      appId: config.appId,
      apiKey: config.apiKey,
      indexName: config.indexName,
      inputSelector: '#' + searchField.id + ' .query',
      autocompleteOptions: { autoselect: false, debug: true, hint: false, keyboardShortcuts: [], minLength: 2 },
      algoliaOptions: algoliaOptions,
      transformData: protectHitOrder,
      queryHook:
        searchField.classList.contains('has-filter') &&
        function (query) {
          controller.algoliaOptions = typeahead.$facetFilterInput.prop('checked')
            ? Object.assign({}, algoliaOptions, { facetFilters: [typeahead.$facetFilterInput.data('facetFilter')] })
            : algoliaOptions
        },
    })
    var input = controller.input
    var typeahead = input.data('aaAutocomplete')
    var dropdown = typeahead.dropdown
    var menu = dropdown.$menu
    typeahead.setVal() // clear value on page reload
    input.on('autocomplete:closed', clearSearch.bind(typeahead))
    input.on('autocomplete:selected', disableClose)
    input.on('autocomplete:updated', onResultsUpdated.bind(typeahead))
    dropdown._ensureVisible = ensureVisible
    menu.off('mousedown.aa')
    var suggestionSelector = '.' + dropdown.cssClasses.prefix + dropdown.cssClasses.suggestion
    menu.on('mousedown.aa', suggestionSelector, onSuggestionMouseDown.bind(dropdown))
    menu.off('mouseenter.aa')
    menu.off('mouseleave.aa')
    typeahead.$facetFilterInput = input
      .closest('#' + searchField.id)
      .find('.filter input')
      .on('change', toggleFilter.bind(typeahead))
      .prop('checked', window.localStorage.getItem(SEARCH_FILTER_ACTIVE_KEY) === 'true')
    monitorCtrlKey(input, dropdown)
    searchField.addEventListener('click', confineEvent)
    document.documentElement.addEventListener('click', clearSearch.bind(typeahead))
    document.addEventListener('keydown', handleShortcuts.bind(typeahead))
    if (input.attr('autofocus') != null) input.focus()
  }

  function appendStylesheet (href) {
    document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: href }))
  }

  function onResultsUpdated () {
    if (isClosed(this)) return
    this.dropdown.datasets[0].$el.scrollTop(0)
  }

  function toggleFilter (e) {
    this.$input.focus()
    window.localStorage.setItem(SEARCH_FILTER_ACTIVE_KEY, e.target.checked)
    if (isClosed(this)) return
    var dropdown = this.dropdown
    dropdown.datasets[0].clearCachedSuggestions()
    dropdown.update(this.getVal())
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
    var container = this.datasets[0].$el[0]
    if (container.scrollHeight === container.offsetHeight) return
    var delta
    var item = el[0]
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
    if (e.ctrlKey ? e.keyCode === SOLIDUS_KEY_CODE : e.keyCode === S_KEY_CODE) {
      this.$input.focus()
      e.preventDefault()
      e.stopPropagation()
    }
  }

  function isClosed (typeahead) {
    var queryForResults = typeahead.dropdown.datasets[0].query
    return queryForResults == null || queryForResults !== typeahead.getVal()
  }

  function monitorCtrlKey (input, dropdown) {
    input.on('keydown', onCtrlKeyDown.bind(dropdown))
    dropdown.$container.on('keyup', onCtrlKeyUp.bind(input))
  }

  function onCtrlKeyDown (e) {
    if (e.keyCode !== CTRL_KEY_CODE) return
    var container = this.datasets[0].$el
    var prevScrollTop = container.scrollTop()
    this.getCurrentCursor().find('a').focus() // calling focus can cause the container to scroll
    container.scrollTop(prevScrollTop)
  }

  function onCtrlKeyUp (e) {
    if (e.keyCode === CTRL_KEY_CODE) this.focus()
  }

  function onSuggestionMouseDown (e) {
    var dropdown = this
    var suggestion = dropdown._getSuggestions().filter('#' + e.currentTarget.id)
    if (suggestion.attr('id') === dropdown._getCursor().attr('id')) return
    dropdown._removeCursor()
    setTimeout(function () {
      dropdown._setCursor(suggestion, false)
    }, 0)
  }

  function clearSearch () {
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
