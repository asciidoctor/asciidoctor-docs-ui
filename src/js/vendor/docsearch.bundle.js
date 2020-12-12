;(function () {
  'use strict'

  var docsearch = require('docsearch.js/dist/cdn/docsearch.js')
  var config = document.getElementById('search-script').dataset
  var link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = config.stylesheet
  document.head.appendChild(link)
  var defaultAlgoliaOptions = { hitsPerPage: parseInt(config.maxResults) || 5 }
  var docsearchComponent = docsearch({
    appId: config.appId,
    apiKey: config.apiKey,
    indexName: config.indexName,
    inputSelector: '#search-input',
    autocompleteOptions: { hint: false, keyboardShortcuts: ['s'] },
    algoliaOptions: defaultAlgoliaOptions,
  })
  var search = docsearchComponent.autocomplete
  search.on('autocomplete:updated', function () {
    this.scrollTop = 0
  }.bind(search.getWrapper().firstChild))
  search.on('autocomplete:closed', function () {
    this.setVal()
  }.bind(search))

  var searchGlobalCheckbox = document.getElementById('search-global')
  if (searchGlobalCheckbox && searchGlobalCheckbox.dataset && searchGlobalCheckbox.dataset.component) {
    searchGlobalCheckbox.addEventListener('change', function () {
      if (searchGlobalCheckbox.checked) {
        docsearchComponent.algoliaOptions = defaultAlgoliaOptions
      } else {
        docsearchComponent.algoliaOptions = Object.assign(defaultAlgoliaOptions, {
          facetFilters: ['component:' + searchGlobalCheckbox.dataset.component],
        })
      }
    })
  }
})()
