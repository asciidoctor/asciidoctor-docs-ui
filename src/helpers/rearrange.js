'use strict'

module.exports = (collection, property, orderSpec) => {
  if (orderSpec == null || orderSpec === '*') return Object.values(collection)
  const sourceCollection = Object.values(collection).reduce((accum, it) => accum.set(it[property], it), new Map())
  const order = orderSpec
    .split(',')
    .map((it) => it.trim())
    .filter((it) => {
      if (it.charAt() !== '!') return true
      sourceCollection.delete(it.substr(1))
    })
  const restIdx = order.indexOf('*')
  if (~restIdx) order.splice(restIdx, 1)
  const targetCollection = order.reduce((accum, key) => {
    if (sourceCollection.has(key)) {
      accum.push(sourceCollection.get(key))
      sourceCollection.delete(key)
    }
    return accum
  }, [])
  if (~restIdx) targetCollection.splice(restIdx, 0, ...sourceCollection.values())
  return targetCollection
}
