'use strict'

module.exports = (object, path) => {
  const paths = path.split('.')
  let result = object
  for (let i = 0, len = paths.length; i < len; i++) {
    if (!(result = result[paths[i]])) break
  }
  return result
}
