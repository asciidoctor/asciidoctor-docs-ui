'use strict'

module.exports = ({ data: { root: { contentCatalog } } }) =>
  contentCatalog && contentCatalog.getSiteStartPage()
