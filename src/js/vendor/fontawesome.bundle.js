;(function () {
  'use strict'

  // NOTE: v4-shims required to support the output of icon macro generated from AsciiDoc content
  require('@fortawesome/fontawesome-free/js/v4-shims')
  var fa = require('@fortawesome/fontawesome-svg-core')

  Object.assign(fa.config, {
    autoReplaceSvg: 'nest',
    keepOriginalSource: false,
    observeMutations: false,
    replacementClass: 'svga',
  })

  var iconDefs = window.FontAwesomeIconDefs || []
  iconDefs.forEach(function (iconDef) {
    fa.library.add(iconDef)
  })

  var admonitionIcons = iconDefs.admonitionIcons || {}
  ;[].slice.call(document.querySelectorAll('td.icon > i.fa')).forEach(function (i) {
    var name = i.className.substr(8)
    i.className = admonitionIcons[name] || 'fas fa-' + name
  })

  fa.dom.i2svg()

  delete window.___FONT_AWESOME___
  delete window.FontAwesomeIconDefs
})()
