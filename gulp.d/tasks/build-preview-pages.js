'use strict'

const Asciidoctor = require('@asciidoctor/core')()
const fs = require('node:fs')
const { promises: fsp } = fs
const handlebars = require('handlebars')
const merge = require('merge-stream')
const ospath = require('node:path')
const path = ospath.posix
const requireFromString = require('require-from-string')
const { Transform } = require('node:stream')
const map = (transform = () => {}, flush = undefined) => new Transform({ objectMode: true, transform, flush })
const vfs = require('vinyl-fs')
const yaml = require('js-yaml')

const ASCIIDOC_ATTRIBUTES = { experimental: '', icons: 'font', sectanchors: '', 'source-highlighter': 'highlight.js' }

module.exports =
  (src, previewSrc, previewDest, sink = () => map()) =>
    (done) =>
      Promise.all([
        loadSampleUiModel(previewSrc),
        toPromise(
          merge(compileLayouts(src), registerPartials(src), registerHelpers(src), copyImages(previewSrc, previewDest))
        ),
      ])
        .then(([baseUiModel, { layouts }]) => [{ ...baseUiModel, env: process.env }, layouts])
        .then(([baseUiModel, layouts]) =>
          vfs
            .src('**/*.adoc', { base: previewSrc, cwd: previewSrc })
            .pipe(
              map((file, enc, next) => {
                const siteRootPath = path.relative(ospath.dirname(file.path), ospath.resolve(previewSrc))
                const uiModel = { ...baseUiModel }
                const url = uiModel.env.DEPLOY_PRIME_URL || uiModel.env.URL
                if (url) uiModel.site.url = url
                uiModel.page = { ...uiModel.page }
                uiModel.siteRootPath = siteRootPath
                uiModel.uiRootPath = path.join(siteRootPath, '_')
                if (file.stem === '404') {
                  uiModel.page = { layout: '404', title: 'Page Not Found' }
                } else {
                  const doc = Asciidoctor.load(file.contents, { safe: 'safe', attributes: ASCIIDOC_ATTRIBUTES })
                  uiModel.page.attributes = Object.entries(doc.getAttributes())
                    .filter(([name, val]) => name.startsWith('page-'))
                    .reduce((accum, [name, val]) => {
                      accum[name.slice(5)] = val
                      return accum
                    }, {})
                  uiModel.page.layout = doc.getAttribute('page-layout', 'default')
                  if (doc.hasAttribute('docrole')) uiModel.page.role = doc.getAttribute('docrole')
                  uiModel.page.title = doc.getDocumentTitle()
                  uiModel.page.contents = Buffer.from(doc.convert())
                }
                file.extname = '.html'
                try {
                  file.contents = Buffer.from(layouts.get(uiModel.page.layout)(uiModel))
                  next(null, file)
                } catch (e) {
                  next(transformHandlebarsError(e, uiModel.page.layout))
                }
              })
            )
            .pipe(vfs.dest(previewDest))
            .on('error', done)
            .pipe(sink())
        )

function loadSampleUiModel (src) {
  return fsp.readFile(ospath.join(src, 'ui-model.yml'), 'utf8').then((contents) => yaml.load(contents))
}

function registerPartials (src) {
  return vfs.src('partials/*.hbs', { base: src, cwd: src }).pipe(
    map((file, enc, next) => {
      handlebars.registerPartial(file.stem, file.contents.toString())
      next()
    })
  )
}

function registerHelpers (src) {
  handlebars.registerHelper('relativize', relativize)
  handlebars.registerHelper('resolvePage', resolvePage)
  handlebars.registerHelper('resolvePageURL', resolvePageURL)
  return vfs.src('helpers/*.js', { base: src, cwd: src }).pipe(
    map((file, enc, next) => {
      handlebars.registerHelper(file.stem, requireFromString(file.contents.toString()))
      next()
    })
  )
}

function compileLayouts (src) {
  const layouts = new Map()
  return vfs.src('layouts/*.hbs', { base: src, cwd: src }).pipe(
    map(
      (file, enc, next) => {
        const srcName = path.join(src, file.relative)
        layouts.set(file.stem, handlebars.compile(file.contents.toString(), { preventIndent: true, srcName }))
        next()
      },
      function (done) {
        this.push({ layouts })
        done()
      }
    )
  )
}

function copyImages (src, dest) {
  return vfs
    .src('**/*.{png,svg}', { base: src, cwd: src })
    .pipe(vfs.dest(dest))
    .pipe(map((file, enc, next) => next()))
}

function relativize (to, { data: { root } }) {
  if (!to) return '#'
  if (to.charAt() !== '/') return to
  const from = root.page.url
  if (!from) return (root.site.path || '') + to
  let hash = ''
  const hashIdx = to.indexOf('#')
  if (~hashIdx) {
    hash = to.slice(hashIdx)
    to = to.slice(0, hashIdx)
  }
  if (to === from) return hash || (to.charAt(to.length - 1) === '/' ? './' : path.basename(to))
  const rel = path.relative(path.dirname(from + '.'), to)
  const toDir = to.charAt(to.length - 1) === '/'
  return rel ? (toDir ? rel + '/' : rel) + hash : (toDir ? './' : '../' + path.basename(to)) + hash
}

function resolvePage (spec, context = {}) {
  if (spec) return { pub: { url: resolvePageURL(spec) } }
}

function resolvePageURL (spec, context = {}) {
  if (spec) return '/' + (spec = spec.split(':').pop()).slice(0, spec.lastIndexOf('.')) + '.html'
}

function transformHandlebarsError ({ message, stack }, layout) {
  const m = stack.match(/^ *at Object\.ret \[as (.+?)\]/m)
  const templatePath = `src/${m ? 'partials/' + m[1] : 'layouts/' + layout}.hbs`
  const err = new Error(`${message}${~message.indexOf('\n') ? '\n^ ' : ' '}in UI template ${templatePath}`)
  err.stack = [err.toString()].concat(stack.slice(message.length + 8)).join('\n')
  return err
}

function toPromise (stream) {
  return new Promise((resolve, reject, data = {}) =>
    stream
      .on('error', reject)
      .on('data', (chunk) => chunk.constructor === Object && Object.assign(data, chunk))
      .on('finish', () => resolve(data))
  )
}
