;(function () {
  'use strict'

  activateSearch(require('docsearch.js/dist/cdn/docsearch.js'), document.getElementById('search-script').dataset)

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
      autocompleteOptions: { autoselect: true, debug: true, hint: false, keyboardShortcuts: ['f', 's'], minLength: 2 },
      algoliaOptions: algoliaOptions,
      queryHook:
        filterInput &&
        function (query) {
          controller.algoliaOptions = filterInput.checked
            ? Object.assign({}, algoliaOptions, { facetFilters: [filterInput.dataset.facetFilter] })
            : algoliaOptions
        },
    })
    var eventEmitter = controller.autocomplete
    var autocomplete = eventEmitter.autocomplete
    autocomplete.setVal()
    eventEmitter.on('autocomplete:selected', disableClose)
    eventEmitter.on('autocomplete:updated', resetScroll.bind(autocomplete.getWrapper().firstChild))
    controller.input.data('aaAutocomplete').dropdown._ensureVisible = ensureVisible
    if (filterInput) filterInput.addEventListener('change', toggleFilter.bind(controller.input))
    searchField.addEventListener('click', confineEvent)
    document.documentElement.addEventListener('click', resetSearch.bind(autocomplete))
    if (controller.input.attr('autofocus') != null) controller.input.focus()
  }

  function appendStylesheet (href) {
    document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: href }))
  }

  function resetScroll () {
    this.scrollTop = 0
  }

  function toggleFilter () {
    this.focus()
    var dropdown = this.data('aaAutocomplete').dropdown
    if (!dropdown.isOpen || !this.val()) return
    dropdown.datasets[0].cachedSuggestions.length = 0
    dropdown.update(this.val())
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

  function resetSearch () {
    this.close()
    this.setVal()
  }
})()
