;(function () {
  'use strict'

  var docsearch = require('docsearch.js/dist/cdn/docsearch.js')
  var config = document.getElementById('search-script').dataset
  var link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = config.stylesheet
  document.head.appendChild(link)
  var search = docsearch({
    appId: config.appId,
    apiKey: config.apiKey,
    indexName: config.indexName,
    inputSelector: '#search-input',
    autocompleteOptions: { hint: false, keyboardShortcuts: ['s'] },
    algoliaOptions: { hitsPerPage: parseInt(config.maxResults) || 5 },
  }).autocomplete
  var autocomplete = search.autocomplete
  search.on(
    'autocomplete:updated',
    function () {
      this.scrollTop = 0
    }.bind(autocomplete.getWrapper().firstChild)
  )
  search.on(
    'autocomplete:closed',
    function () {
      this.setVal()
    }.bind(autocomplete)
  )
})()
