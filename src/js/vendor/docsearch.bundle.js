;(function () {
  'use strict'

  var FORWARD_BACK_TYPE = 2
  var CTRL_KEY_CODE = 17
  var LT_KEY_CODE = 188
  var S_KEY_CODE = 83
  var SOLIDUS_KEY_CODE = 191
  var SEARCH_FILTER_ACTIVE_KEY = 'docs:search-filter-active'
  var SAVED_SEARCH_STATE_KEY = 'docs:saved-search-state'

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
    input.on('autocomplete:cursorchanged autocomplete:cursorremoved', saveSearchState.bind(typeahead))
    input.on('autocomplete:selected', onSuggestionSelected.bind(typeahead))
    input.on('autocomplete:updated', onResultsUpdated.bind(typeahead))
    dropdown._ensureVisible = ensureVisible
    menu.off('mousedown.aa')
    menu.off('mouseenter.aa')
    menu.off('mouseleave.aa')
    var suggestionSelector = '.' + dropdown.cssClasses.prefix + dropdown.cssClasses.suggestion
    menu.on('mousedown.aa', suggestionSelector, onSuggestionMouseDown.bind(dropdown))
    typeahead.$facetFilterInput = input
      .closest('#' + searchField.id)
      .find('.filter input')
      .on('change', toggleFilter.bind(typeahead))
      .prop('checked', window.localStorage.getItem(SEARCH_FILTER_ACTIVE_KEY) === 'true')
    monitorCtrlKey.call(typeahead)
    searchField.addEventListener('click', confineEvent)
    document.documentElement.addEventListener('click', clearSearch.bind(typeahead))
    document.addEventListener('keydown', handleShortcuts.bind(typeahead))
    if (input.attr('autofocus') != null) input.focus()
    window.addEventListener('pageshow', reactivateSearch.bind(typeahead))
  }

  function reactivateSearch (e) {
    var navigationType = (window.performance.navigation || {}).type
    if (navigationType && navigationType !== FORWARD_BACK_TYPE) return
    if (e.persisted && !isClosed(this)) {
      this.$input.focus()
      this.$input.val(this.getVal())
    } else if (window.sessionStorage.getItem('docs:restore-search-on-back') === 'true') {
      restoreSearch.call(this)
    }
    window.sessionStorage.removeItem('docs:restore-search-on-back')
  }

  function appendStylesheet (href) {
    document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: href }))
  }

  function onResultsUpdated () {
    var dropdown = this.dropdown
    var restoring = dropdown.restoring
    delete dropdown.restoring
    if (isClosed(this)) return
    getScrollableResultsContainer(dropdown).scrollTop(0)
    if (restoring && restoring.query === this.getVal() && restoring.filter === this.$facetFilterInput.prop('checked')) {
      var cursor = restoring.cursor
      if (cursor) dropdown._moveCursor(cursor)
    } else {
      saveSearchState.call(this)
    }
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

  function ensureVisible (el) {
    var container = getScrollableResultsContainer(this)[0]
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

  function getScrollableResultsContainer (dropdown) {
    return dropdown.datasets[0].$el
  }

  function handleShortcuts (e) {
    var target = e.target || {}
    if (e.ctrlKey && e.keyCode === LT_KEY_CODE && target === this.$input[0]) {
      restoreSearch.call(this)
      return
    }
    if (e.altKey || e.shiftKey || target.isContentEditable || 'disabled' in target) return
    if (e.ctrlKey ? e.keyCode === SOLIDUS_KEY_CODE : e.keyCode === S_KEY_CODE) {
      this.$input.focus()
      e.preventDefault()
      e.stopPropagation()
    }
  }

  function isClosed (typeahead) {
    var query = typeahead.getVal()
    return !query || query !== typeahead.dropdown.datasets[0].query
  }

  function monitorCtrlKey () {
    this.$input.on('keydown', onCtrlKeyDown.bind(this))
    this.dropdown.$container.on('keyup', onCtrlKeyUp.bind(this))
  }

  function onCtrlKeyDown (e) {
    if (e.keyCode !== CTRL_KEY_CODE) return
    this.ctrlKeyDown = true
    var dropdown = this.dropdown
    var container = getScrollableResultsContainer(dropdown)
    var prevScrollTop = container.scrollTop()
    dropdown.getCurrentCursor().find('a').focus()
    container.scrollTop(prevScrollTop) // calling focus can cause the container to scroll, so restore it
  }

  function onCtrlKeyUp (e) {
    if (e.keyCode !== CTRL_KEY_CODE) return
    delete this.ctrlKeyDown
    this.$input.focus()
  }

  function onSuggestionMouseDown (e) {
    var dropdown = this
    var suggestion = dropdown._getSuggestions().filter('#' + e.currentTarget.id)
    if (suggestion[0] === dropdown._getCursor()[0]) return
    dropdown._removeCursor()
    dropdown._setCursor(suggestion, false)
  }

  function onSuggestionSelected (e, suggestion, datasetNum, context) {
    if (!this.ctrlKeyDown) {
      if (context.selectionMethod === 'click') saveSearchState.call(this)
      window.sessionStorage.setItem('docs:restore-search-on-back', 'true')
    }
    e.isDefaultPrevented = function () {
      return true
    }
  }

  function clearSearch () {
    this.setVal()
    delete this.ctrlKeyDown
  }

  // preserves the original order of results by qualifying unique occurrences of the same lvl0 and lvl1 values
  function protectHitOrder (hits) {
    var prevLvl0
    var lvl0Qualifiers = {}
    var lvl1Qualifiers = {}
    return hits.map(function (hit) {
      var lvl0 = hit.hierarchy.lvl0
      var lvl1 = hit.hierarchy.lvl1
      var lvl0Qualifier = lvl0Qualifiers[lvl0]
      if (lvl0 !== prevLvl0) {
        lvl0Qualifiers[lvl0] = lvl0Qualifier == null ? (lvl0Qualifier = '') : (lvl0Qualifier += ' ')
        lvl1Qualifiers = {}
      }
      if (lvl0Qualifier) hit.hierarchy.lvl0 = lvl0 + lvl0Qualifier
      if (lvl1 in lvl1Qualifiers) {
        hit.hierarchy.lvl1 = lvl1 + (lvl1Qualifiers[lvl1] += ' ')
      } else {
        lvl1Qualifiers[lvl1] = ''
      }
      prevLvl0 = lvl0
      return hit
    })
  }

  function readSavedSearchState () {
    try {
      var state = window.localStorage.getItem(SAVED_SEARCH_STATE_KEY)
      if (state) return JSON.parse(state)
    } catch (e) {
      window.localStorage.removeItem(SAVED_SEARCH_STATE_KEY)
    }
  }

  function restoreSearch () {
    var searchState = readSavedSearchState()
    if (!searchState) return
    this.setVal()
    this.$facetFilterInput.prop('checked', searchState.filter)
    var dropdown = this.dropdown
    dropdown.datasets[0].clearCachedSuggestions()
    dropdown.restoring = searchState
    this.$input.focus()
    this.setVal(searchState.query) // cursor is restored by onResultsUpdated =>
  }

  function saveSearchState () {
    if (isClosed(this)) return
    window.localStorage.setItem(
      SAVED_SEARCH_STATE_KEY,
      JSON.stringify({
        query: this.getVal(),
        filter: this.$facetFilterInput.prop('checked'),
        cursor: this.dropdown.getCurrentCursor().index() + 1,
      })
    )
  }
})()
