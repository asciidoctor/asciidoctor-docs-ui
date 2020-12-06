var window
;(function (scope) {
  'use strict'

  var admonitionIcons = {
    caution: 'fas fa-fire',
    important: 'fas fa-exclamation-circle',
    note: 'fas fa-info-circle',
    tip: 'fas fa-lightbulb',
    warning: 'fas fa-exclamation-triangle',
  }
  var additionalIcons = [
    'fas fa-angle-right',
    'far fa-copy',
    'far fa-check-square',
    'fab fa-github',
    'far fa-square',
    'fab fa-twitter',
  ]
  var iconDefs = (scope.FontAwesomeIconDefs = [])
  iconDefs.admonitionIcons = admonitionIcons
  iconDefs.includes = Object.values(admonitionIcons).concat(additionalIcons)
})(window || module.exports)
