'use strict'

module.exports = ({
  data: {
    root: { contentCatalog = { getSiteStartPage () {} } },
  },
}) => contentCatalog.getSiteStartPage()
