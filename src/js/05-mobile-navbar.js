;(function () {
  'use strict'

  var navbarBurger = document.querySelector('.navbar-burger')
  if (!navbarBurger) return
  navbarBurger.addEventListener('click', toggleNavbarMenu.bind(navbarBurger))

  function toggleNavbarMenu (e) {
    e.stopPropagation() // trap event
    var html = document.documentElement
    var menu = document.getElementById(this.getAttribute('aria-controls') || this.dataset.target)
    if (!menu.classList.contains('is-active') && /mobi/i.test(window.navigator.userAgent)) {
      if (Math.round(parseFloat(window.getComputedStyle(html).minHeight)) !== window.innerHeight) {
        html.style.setProperty('--vh', window.innerHeight / 100 + 'px')
      } else {
        html.style.removeProperty('--vh')
      }
    }
    html.classList.toggle('is-clipped--navbar')
    navbarBurger.setAttribute('aria-expanded', this.classList.toggle('is-active'))
    menu.classList.toggle('is-active')
  }
})()
