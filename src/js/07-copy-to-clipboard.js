;(function () {
  'use strict'
  ;[].slice.call(document.querySelectorAll('.doc pre.highlight, .doc .literalblock pre')).forEach(function (pre) {
    var code, language, lang, copy, toast, toolbox
    if (pre.classList.contains('highlight')) {
      code = pre.querySelector('code')
      if ((language = code.dataset.lang) && language !== 'console') {
        ;(lang = document.createElement('span')).className = 'code-lang'
        lang.appendChild(document.createTextNode(language))
      }
    } else if (pre.innerText.startsWith('$ ')) {
      var block = pre.parentNode.parentNode
      block.classList.remove('literalblock')
      block.classList.add('listingblock')
      pre.classList.add('highlightjs')
      pre.classList.add('highlight')
      ;(code = document.createElement('code')).className = 'language-console hljs'
      code.dataset.lang = 'console'
      code.appendChild(pre.firstChild)
      pre.appendChild(code)
    } else {
      return
    }
    ;(copy = document.createElement('button')).className = 'copy-button'
    copy.setAttribute('title', 'Copy to clipboard')
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'copy-icon')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('data-prefix', 'far')
    svg.setAttribute('data-icon', 'copy')
    svg.setAttribute('data-version', '5.10.2')
    svg.setAttribute('role', 'img')
    svg.setAttribute('viewBox', '0 0 448 512')
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('fill', 'currentColor')
    path.setAttribute(
      'd',
      'M433.941 65.941l-51.882-51.882A48 48 0 0 0 348.118 0H176c-26.51 0-48 21.49-48 48v48H48c-26.51 0-48 21.49-48 48v320c0 26.51 21.49 48 48 48h224c26.51 0 48-21.49 48-48v-48h80c26.51 0 48-21.49 48-48V99.882a48 48 0 0 0-14.059-33.941zM266 464H54a6 6 0 0 1-6-6V150a6 6 0 0 1 6-6h74v224c0 26.51 21.49 48 48 48h96v42a6 6 0 0 1-6 6zm128-96H182a6 6 0 0 1-6-6V54a6 6 0 0 1 6-6h106v88c0 13.255 10.745 24 24 24h88v202a6 6 0 0 1-6 6zm6-256h-64V48h9.632c1.591 0 3.117.632 4.243 1.757l48.368 48.368a6 6 0 0 1 1.757 4.243V112z' // eslint-disable-line max-len
    )
    svg.appendChild(path)
    copy.appendChild(svg)
    ;(toast = document.createElement('span')).className = 'copy-toast'
    toast.appendChild(document.createTextNode('Copied!'))
    copy.appendChild(toast)
    ;(toolbox = document.createElement('div')).className = 'code-toolbox'
    if (lang) toolbox.appendChild(lang)
    toolbox.appendChild(copy)
    pre.appendChild(toolbox)
    copy.addEventListener('click', writeToClipboard.bind(copy, code))
  })

  function writeToClipboard (code) {
    var text = code.innerText
    if (code.dataset.lang === 'console' && text.startsWith('$ ')) text = text.split('\n')[0].slice(2)
    window.navigator.clipboard.writeText(text).then(
      function () {
        this.classList.add('clicked')
        this.offsetHeight // eslint-disable-line no-unused-expressions
        this.classList.remove('clicked')
      }.bind(this),
      function () {}
    )
  }
})()
