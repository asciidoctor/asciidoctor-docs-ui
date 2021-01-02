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

  var currentPageItem = menuPanel.querySelector('.is-current-page')
  var originalPageItem = currentPageItem
  if (currentPageItem) {
    activateCurrentPath(currentPageItem)
    scrollItemToMidpoint(menuPanel, currentPageItem)
  } else {
    menuPanel.scrollTop = 0
  }

  menuPanel.querySelector('.nav-menu-toggle').addEventListener('click', function () {
    var collapse = !this.classList.toggle('is-active')
    find(menuPanel, '.nav-item > .nav-item-toggle').forEach(function (btn) {
      collapse ? btn.parentElement.classList.remove('is-active') : btn.parentElement.classList.add('is-active')
    })
    if (currentPageItem) {
      if (collapse) activateCurrentPath(currentPageItem, false)
      scrollItemToMidpoint(menuPanel, currentPageItem)
    } else if (collapse) {
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
    // NOTE logic assumes there are only two panels
    find(nav, '[data-panel]').forEach(function (panel) {
      panel.classList.toggle('is-active')
    })
  })

  // NOTE prevent text from being selected by double click
  menuPanel.addEventListener('mousedown', function (e) {
    if (e.detail > 1) e.preventDefault()
  })

  function onHashChange () {
    var navItem, navLink
    var hash = window.location.hash
    if (hash) {
      if (hash.indexOf('%')) hash = decodeURIComponent(hash)
      if (!(navLink = menuPanel.querySelector('.nav-link[href="' + hash + '"]'))) {
        var targetNode = document.getElementById(hash.slice(1))
        if (targetNode) {
          var current = targetNode
          var ceiling = document.querySelector('article.doc')
          while ((current = current.parentNode) && current !== ceiling) {
            var id = current.id
            // NOTE: look for section heading
            if (!id && (id = SECT_CLASS_RX.test(current.className))) id = (current.firstElementChild || {}).id
            if (id && (navLink = menuPanel.querySelector('.nav-link[href="#' + id + '"]'))) break
          }
        }
      }
    }
    if (navLink) {
      navItem = navLink.parentNode
    } else if (originalPageItem) {
      navLink = (navItem = originalPageItem).querySelector('.nav-link')
    } else {
      return
    }
    if (navItem === currentPageItem) return
    find(menuPanel, '.nav-item.is-active').forEach(function (el) {
      el.classList.remove('is-current-path', 'is-current-page', 'is-active')
    })
    ;(currentPageItem = navItem).classList.add('is-current-page')
    activateCurrentPath(currentPageItem)
    scrollItemToMidpoint(menuPanel, currentPageItem)
  }

  if (menuPanel.querySelector('.nav-link[href^="#"]')) {
    if (window.location.hash) onHashChange()
    window.addEventListener('hashchange', onHashChange)
  }

  function activateCurrentPath (navItem, trace) {
    var ancestorClasses
    var ancestor = navItem.parentNode
    while (!(ancestorClasses = ancestor.classList).contains('nav-menu')) {
      if (ancestor.tagName === 'LI' && ancestorClasses.contains('nav-item')) {
        if (trace !== false) ancestorClasses.add('is-current-path')
        ancestorClasses.add('is-active')
      }
      ancestor = ancestor.parentNode
    }
    navItem.classList.add('is-active')
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
