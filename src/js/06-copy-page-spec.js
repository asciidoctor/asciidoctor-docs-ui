;(function () {
  'use strict'

  var editPageLink = document.querySelector('.toolbar .edit-this-page a')
  if (!editPageLink) return
  editPageLink.addEventListener('click', function (e) {
    if (e.altKey) navigator.clipboard.writeText(document.querySelector('head meta[name=page-spec]').content)
  })
})()
