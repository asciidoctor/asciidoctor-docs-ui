'use strict'

module.exports = (
  navigation,
  {
    data: {
      root: { page },
    },
  }
) => {
  traceCurrentPathInternal(navigation, page.url)
  return navigation
}

function traceCurrentPathInternal (items, currentPageUrl, path = []) {
  for (const item of items) {
    if (item.url === currentPageUrl) {
      for (const ancestor of path) ancestor.current = 'path'
      item.current = 'page'
      return true
    }
    if (item.items && traceCurrentPathInternal(item.items, currentPageUrl, path.concat(item))) return true
  }
}
