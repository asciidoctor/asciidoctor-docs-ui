;(function () {
  'use strict'

  var pageSpec = (document.querySelector('head meta[name=page-spec]') || {}).content
  var editPageLink = document.querySelector('.toolbar .edit-this-page a')
  if (!(pageSpec && editPageLink)) return
  if (editPageLink) editPageLink.addEventListener('click', onEditPageLinkClick)
  ;[].slice.call(document.querySelectorAll('.doc a.anchor')).forEach(function (anchor) {
    if (/H[2-6]/.test(anchor.parentNode.tagName)) anchor.addEventListener('click', onSectionAnchorClick.bind(anchor))
  })

  function onEditPageLinkClick (e) {
    if (e.altKey) navigator.clipboard.writeText(pageSpec)
  }

  function onSectionAnchorClick (e) {
    if (e.altKey) {
      e.preventDefault()
      navigator.clipboard.writeText(pageSpec + decodeFragment(this.hash))
    }
  }

  function decodeFragment (hash) {
    return ~hash.indexOf('%') ? decodeURIComponent(hash) : hash
  }
})()
