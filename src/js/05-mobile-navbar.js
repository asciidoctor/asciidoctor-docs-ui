document.addEventListener('DOMContentLoaded', function () {
  var navbarToggles = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0)
  if (navbarToggles.length === 0) return
  navbarToggles.forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation()
      document.documentElement.classList.toggle('is-clipped--navbar')
      el.classList.toggle('is-active')
      var menu = document.getElementById(el.dataset.target)
      if (menu.classList.toggle('is-active')) {
        var expectedMaxHeight = window.innerHeight - Math.round(menu.getBoundingClientRect().top)
        var actualMaxHeight = parseInt(window.getComputedStyle(menu).maxHeight)
        if (actualMaxHeight !== expectedMaxHeight) menu.style.maxHeight = expectedMaxHeight + 'px'
      }
    })
  })
})
