;(function () {
  'use strict'

  var SECT_CLASS_RX = /^sect[0-5](?=$| )/

  var navContainer = document.querySelector('.nav-container')
  var navToggle = document.querySelector('.toolbar .nav-toggle')

  navToggle.addEventListener('click', showNav)
  navContainer.addEventListener('click', trapEvent)

  var menuPanel = navContainer.querySelector('[data-panel=menu]')
  if (!menuPanel) return
  var nav = navContainer.querySelector('.nav')

  var currentPageItem
  if (menuPanel.classList.contains('is-loading')) {
    if ((currentPageItem = findItemForHash() || menuPanel.querySelector('.is-current-url'))) {
      activateCurrentPath(currentPageItem)
      scrollItemToMidpoint(menuPanel, currentPageItem)
    } else {
      menuPanel.scrollTop = 0
    }
    menuPanel.classList.remove('is-loading')
  } else {
    var match = (currentPageItem = menuPanel.querySelector('.is-current-page'))
    if ((!match || match.classList.contains('is-provisional')) && (match = findItemForHash(true))) {
      var update = !!currentPageItem
      activateCurrentPath((currentPageItem = match), update)
      scrollItemToMidpoint(menuPanel, currentPageItem)
    }
  }

  menuPanel.querySelector('.nav-menu-toggle').addEventListener('click', function () {
    var collapse = !this.classList.toggle('is-active')
    find(menuPanel, '.nav-item > .nav-item-toggle').forEach(function (btn) {
      collapse ? btn.parentElement.classList.remove('is-active') : btn.parentElement.classList.add('is-active')
    })
    if (currentPageItem) {
      if (collapse) activateCurrentPath(currentPageItem)
      scrollItemToMidpoint(menuPanel, currentPageItem)
    } else {
      menuPanel.scrollTop = 0
    }
  })

  find(menuPanel, '.nav-item-toggle').forEach(function (btn) {
    btn.addEventListener('click', toggleActive.bind(btn.parentElement))
    var nextElement = btn.nextElementSibling
    if (nextElement && nextElement.classList.contains('nav-text')) {
      nextElement.style.cursor = 'pointer'
      nextElement.addEventListener('click', toggleActive.bind(btn.parentElement))
    }
  })

  nav.querySelector('[data-panel=explore] .context').addEventListener('click', function () {
    find(nav, '[data-panel]').forEach(function (panel) {
      // NOTE logic assumes there are only two panels
      panel.classList.toggle('is-active')
    })
  })

  // NOTE prevent text from being selected by double click
  menuPanel.addEventListener('mousedown', function (e) {
    if (e.detail > 1) e.preventDefault()
  })

  function onHashChange () {
    var navItem = findItemForHash() || menuPanel.querySelector('.is-current-url')
    if (!navItem || navItem === currentPageItem) return
    activateCurrentPath((currentPageItem = navItem), true)
    scrollItemToMidpoint(menuPanel, currentPageItem)
  }

  if (menuPanel.querySelector('.nav-link[href^="#"]')) window.addEventListener('hashchange', onHashChange)

  function activateCurrentPath (navItem, update) {
    if (update) {
      find(menuPanel, '.nav-item.is-active').forEach(function (el) {
        el.classList.remove('is-current-path', 'is-current-page', 'is-active')
      })
    }
    var ancestor = navItem
    while ((ancestor = ancestor.parentNode) && ancestor !== menuPanel) {
      if (ancestor.classList.contains('nav-item')) ancestor.classList.add('is-current-path', 'is-active')
    }
    navItem.classList.add('is-current-page', 'is-active')
  }

  function toggleActive () {
    if (this.classList.toggle('is-active')) {
      var padding = parseFloat(window.getComputedStyle(this).marginTop)
      var rect = this.getBoundingClientRect()
      var menuPanelRect = menuPanel.getBoundingClientRect()
      var overflowY = (rect.bottom - menuPanelRect.top - menuPanelRect.height + padding).toFixed()
      if (overflowY > 0) menuPanel.scrollTop += Math.min((rect.top - menuPanelRect.top - padding).toFixed(), overflowY)
    }
  }

  function showNav (e) {
    if (navToggle.classList.contains('is-active')) return hideNav(e)
    trapEvent(e)
    var html = document.documentElement
    if (/mobi/i.test(window.navigator.userAgent)) {
      if (Math.round(parseFloat(window.getComputedStyle(html).minHeight)) !== window.innerHeight) {
        html.style.setProperty('--vh', window.innerHeight / 100 + 'px')
      } else {
        html.style.removeProperty('--vh')
      }
    }
    html.classList.add('is-clipped--nav')
    navToggle.classList.add('is-active')
    navContainer.classList.add('is-active')
    html.addEventListener('click', hideNav)
  }

  function hideNav (e) {
    trapEvent(e)
    var html = document.documentElement
    html.classList.remove('is-clipped--nav')
    navToggle.classList.remove('is-active')
    navContainer.classList.remove('is-active')
    html.removeEventListener('click', hideNav)
  }

  function trapEvent (e) {
    e.stopPropagation()
  }

  function findItemForHash (articleOnly) {
    var hash = window.location.hash
    if (!hash) return
    if (hash.indexOf('%')) hash = decodeURIComponent(hash)
    if (hash.indexOf('"')) hash = hash.replace(/(?=")/g, '\\')
    var navLink = !articleOnly && menuPanel.querySelector('.nav-link[href="' + hash + '"]')
    if (navLink) return navLink.parentNode
    var target = document.getElementById(hash.slice(1))
    if (!target) return
    var scope = document.querySelector('article.doc')
    var ancestor = target
    while ((ancestor = ancestor.parentNode) && ancestor !== scope) {
      var id = ancestor.id
      if (!id) id = SECT_CLASS_RX.test(ancestor.className) && (ancestor.firstElementChild || {}).id
      if (id && (navLink = menuPanel.querySelector('.nav-link[href="#' + id + '"]'))) return navLink.parentNode
    }
  }

  function scrollItemToMidpoint (panel, item) {
    if (panel.scrollHeight === panel.clientHeight) return // not scrollable
    var panelRect = panel.getBoundingClientRect()
    var linkRect = item.querySelector('.nav-link').getBoundingClientRect()
    panel.scrollTop += Math.round(linkRect.top - panelRect.top - (panelRect.height - linkRect.height) * 0.5)
  }

  function find (from, selector) {
    return [].slice.call(from.querySelectorAll(selector))
  }
})()
