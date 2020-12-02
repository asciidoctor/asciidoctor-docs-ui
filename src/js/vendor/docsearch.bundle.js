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
    algoliaOptions: { hitsPerPage: 10 },
  }).autocomplete
  search.on('autocomplete:closed', function () {
    search.autocomplete.setVal()
  })
})()
