'use strict'

module.exports = (page) => {
  const segments = []
  if (page.component.latest !== page.componentVersion) segments.push(`${page.version}@`)
  segments.push(`${page.component.name}:`)
  segments.push(page.module === 'ROOT' ? ':' : `${page.module}:`)
  segments.push(page.relativeSrcPath)
  return segments.join('')
}
