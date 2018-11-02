'use strict'

const asciidoctor = require('asciidoctor.js')()
const fs = require('fs')
const handlebars = require('handlebars')
const map = require('map-stream')
const path = require('path')
const { promisify } = require('util')
const requireFromString = require('require-from-string')
const vfs = require('vinyl-fs')
const yaml = require('js-yaml')
const ASCIIDOC_ATTRIBUTES = {
  experimental: '',
  icons: 'font',
  sectanchors: '',
  'source-highlighter': 'highlight.js',
}

module.exports = async (src, dest, siteSrc, siteDest, sink) => {
  const [baseUiModel, layouts] = await Promise.all([
    loadSampleUiModel(siteSrc),
    compileLayouts(src),
    registerPartials(src),
    registerHelpers(src),
    copyImages(siteSrc, siteDest),
  ])

  baseUiModel.env = process.env
  const stream = vfs
    .src('**/*.adoc', { base: siteSrc, cwd: siteSrc })
    .pipe(
      map((file, next) => {
        const siteRootPath = path.relative(path.dirname(file.path), path.resolve(siteSrc))
        const uiModel = Object.assign({}, baseUiModel)
        uiModel.page = Object.assign({}, uiModel.page)
        uiModel.siteRootPath = siteRootPath
        uiModel.siteRootUrl = path.join(siteRootPath, 'index.html')
        uiModel.uiRootPath = path.join(siteRootPath, '_')
        if (file.stem === '404') {
          uiModel.page = { layout: '404', title: 'Page Not Found' }
        } else {
          const doc = asciidoctor.load(file.contents, { safe: 'safe', attributes: ASCIIDOC_ATTRIBUTES })
          uiModel.page.attributes = Object.entries(doc.getAttributes())
            .filter(([name, val]) => name.startsWith('page-'))
            .reduce((accum, [name, val]) => {
              accum[name.substr(5)] = val
              return accum
            }, {})
          uiModel.page.layout = doc.getAttribute('page-layout', 'default')
          uiModel.page.title = doc.getDocumentTitle()
          uiModel.page.contents = Buffer.from(doc.convert())
          if (file.stem === 'home') {
            uiModel.page.component = Object.assign({}, uiModel.page.component, { name: 'home' })
          }
        }
        file.extname = '.html'
        file.contents = Buffer.from(layouts[uiModel.page.layout](uiModel))
        next(null, file)
      })
    )
    .pipe(vfs.dest(siteDest))

  if (sink) stream.pipe(sink())
  return stream
}

function loadSampleUiModel (siteSrc) {
  return promisify(fs.readFile)(path.join(siteSrc, 'ui-model.yml'), 'utf8').then((contents) => yaml.safeLoad(contents))
}

function registerPartials (src) {
  return new Promise((resolve, reject) => {
    vfs
      .src('partials/*.hbs', { base: src, cwd: src })
      .pipe(
        map((file, next) => {
          handlebars.registerPartial(file.stem, file.contents.toString())
          next(null, file)
        })
      )
      .on('error', reject)
      .on('end', resolve)
  })
}

function registerHelpers (src) {
  return new Promise((resolve, reject) => {
    vfs
      .src('helpers/*.js', { base: src, cwd: src })
      .pipe(
        map((file, next) => {
          const helperFunction = requireFromString(file.contents.toString())
          handlebars.registerHelper(file.stem, helperFunction)
          next(null, file)
        })
      )
      .on('error', reject)
      .on('end', resolve)
  })
}

function compileLayouts (src) {
  const layouts = {}
  return new Promise((resolve, reject) => {
    vfs
      .src('layouts/*.hbs', { base: src, cwd: src })
      .pipe(
        map((file, next) => {
          layouts[file.stem] = handlebars.compile(file.contents.toString(), { preventIndent: true })
          next(null, file)
        })
      )
      .on('error', reject)
      .on('end', () => resolve(layouts))
  })
}

function copyImages (src, dest) {
  return new Promise((resolve, reject) => {
    vfs
      .src('**/*.{png,svg}', { base: src, cwd: src })
      .pipe(vfs.dest(dest))
      .on('error', reject)
      .on('end', resolve)
  })
}
