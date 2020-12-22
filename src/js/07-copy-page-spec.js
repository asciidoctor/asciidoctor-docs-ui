;(function () {
  'use strict'

  if (!window.navigator.clipboard) return

  var HEADING_RX = /H[2-6]/

  var pageSpec = (document.querySelector('head meta[name=page-spec]') || {}).content
  var editPageLink = document.querySelector('.toolbar .edit-this-page a')
  if (!(pageSpec && editPageLink)) return
  if (editPageLink) editPageLink.addEventListener('click', onEditPageLinkClick)
  ;[].slice.call(document.querySelectorAll('.doc a.anchor')).forEach(function (anchor) {
    if (HEADING_RX.test(anchor.parentNode.tagName)) anchor.addEventListener('click', onSectionAnchorClick.bind(anchor))
  })

  function onEditPageLinkClick (e) {
    if (e.altKey) writeToClipboard(pageSpec)
  }

  function onSectionAnchorClick (e) {
    if (e.altKey) {
      e.preventDefault()
      writeToClipboard(pageSpec + decodeFragment(this.hash))
    }
  }

  function decodeFragment (hash) {
    return ~hash.indexOf('%') ? decodeURIComponent(hash) : hash
  }

  function writeToClipboard (text) {
    window.navigator.clipboard.writeText(text).then(
      function () {},
      function () {}
    )
  }
})()
