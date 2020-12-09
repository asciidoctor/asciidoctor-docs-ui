'use strict'

const autoprefixer = require('autoprefixer')
const browserify = require('browserify')
const buffer = require('vinyl-buffer')
const concat = require('gulp-concat')
const cssnano = require('cssnano')
const fs = require('fs')
const { promises: fsp } = fs
const iconPacks = {
  fa: require('@fortawesome/free-solid-svg-icons'),
  fas: require('@fortawesome/free-solid-svg-icons'),
  far: require('@fortawesome/free-regular-svg-icons'),
  fab: require('@fortawesome/free-brands-svg-icons'),
  __v4__: require('@fortawesome/fontawesome-free/js/v4-shims').reduce(
    (accum, it) => accum.set(`fa-${it[0]}`, [it[1] || 'fas', `fa-${it[2] || it[0]}`]),
    new Map()
  ),
}
const imagemin = require('gulp-imagemin')
const merge = require('merge-stream')
const ospath = require('path')
const path = ospath.posix
const postcss = require('gulp-postcss')
const postcssCalc = require('postcss-calc')
const postcssImport = require('postcss-import')
const postcssUrl = require('postcss-url')
const postcssVar = require('postcss-custom-properties')
const { Transform } = require('stream')
const map = (transform) => new Transform({ objectMode: true, transform })
const through = () => map((file, enc, next) => next(null, file))
const uglify = require('gulp-uglify')
const vfs = require('vinyl-fs')

module.exports = (src, dest, preview) => () => {
  const opts = { base: src, cwd: src }
  const sourcemaps = preview || process.env.SOURCEMAPS === 'true'
  const postcssPlugins = [
    postcssImport,
    (css, { messages, opts: { file } }) =>
      Promise.all(
        messages
          .reduce((accum, { file: depPath, type }) => (type === 'dependency' ? accum.concat(depPath) : accum), [])
          .map((importedPath) => fsp.stat(importedPath).then(({ mtime }) => mtime))
      ).then((mtimes) => {
        const newestMtime = mtimes.reduce((max, curr) => (!max || curr > max ? curr : max), file.stat.mtime)
        if (newestMtime > file.stat.mtime) file.stat.mtimeMs = +(file.stat.mtime = newestMtime)
      }),
    postcssUrl([
      {
        filter: '**/~typeface-*/files/*',
        url: (asset) => {
          const relpath = asset.pathname.substr(1)
          const abspath = require.resolve(relpath)
          const basename = ospath.basename(abspath)
          const destpath = ospath.join(dest, 'font', basename)
          if (!fs.existsSync(destpath)) {
            fs.mkdirSync(ospath.join(dest, 'font'), { recursive: true })
            fs.copyFileSync(abspath, destpath)
          }
          return path.join('..', 'font', basename)
        },
      },
    ]),
    postcssVar({ preserve: preview }),
    preview ? postcssCalc : () => {},
    autoprefixer,
    preview
      ? () => {}
      : (css, result) => cssnano({ preset: 'default' })(css, result).then(() => postcssPseudoElementFixer(css, result)),
  ]

  return merge(
    vfs
      .src('js/+([0-9])-*.js', { ...opts, sourcemaps })
      .pipe(uglify())
      // NOTE concat already uses stat from newest combined file
      .pipe(concat('js/site.js')),
    vfs
      .src('js/vendor/*.js', { ...opts, read: false })
      .pipe(
        // see https://gulpjs.org/recipes/browserify-multiple-destination.html
        map((file, enc, next) => {
          if (file.relative.endsWith('.bundle.js')) {
            const mtimePromises = []
            const bundlePath = file.path
            browserify(file.relative, { basedir: src, detectGlobals: false })
              .plugin('browser-pack-flat/plugin')
              .on('file', (bundledPath) => {
                if (bundledPath !== bundlePath) mtimePromises.push(fsp.stat(bundledPath).then(({ mtime }) => mtime))
              })
              .bundle((bundleError, bundleBuffer) =>
                Promise.all(mtimePromises).then((mtimes) => {
                  const newestMtime = mtimes.reduce((max, curr) => (curr > max ? curr : max), file.stat.mtime)
                  if (newestMtime > file.stat.mtime) file.stat.mtimeMs = +(file.stat.mtime = newestMtime)
                  if (bundleBuffer !== undefined) file.contents = bundleBuffer
                  file.path = file.path.slice(0, file.path.length - 10) + '.js'
                  next(bundleError, file)
                })
              )
          } else if (file.relative === 'js/vendor/fontawesome-icon-defs.js') {
            file.contents = Buffer.from(populateIconDefs(require(file.path)))
            next(null, file)
          } else {
            fsp.readFile(file.path, 'UTF-8').then((contents) => {
              file.contents = Buffer.from(contents)
              next(null, file)
            })
          }
        })
      )
      .pipe(buffer())
      .pipe(uglify()),
    // NOTE use this statement to bundle a JavaScript library that cannot be browserified, like jQuery
    //vfs.src(require.resolve('<package-name-or-require-path>'), opts).pipe(concat('js/vendor/<library-name>.js')),
    vfs
      .src(['css/site.css', 'css/vendor/*.css'], { ...opts, sourcemaps })
      .pipe(postcss((file) => ({ plugins: postcssPlugins, options: { file } }))),
    vfs.src('font/*.{ttf,woff*(2)}', opts),
    vfs
      .src('img/**/*.{gif,ico,jpg,png,svg}', opts)
      .pipe(
        preview
          ? through()
          : imagemin(
            [
              imagemin.gifsicle(),
              imagemin.jpegtran(),
              imagemin.optipng(),
              imagemin.svgo({ plugins: [{ removeViewBox: false }] }),
            ].reduce((accum, it) => (it ? accum.concat(it) : accum), [])
          )
      ),
    vfs.src('helpers/*.js', opts),
    vfs.src('layouts/*.hbs', opts),
    vfs.src('partials/*.hbs', opts)
  ).pipe(vfs.dest(dest, { sourcemaps: sourcemaps && '.' }))
}

function postcssPseudoElementFixer (css, result) {
  css.walkRules(/(?:^|[^:]):(?:before|after)/, (rule) => {
    rule.selector = rule.selectors.map((it) => it.replace(/(^|[^:]):(before|after)$/, '$1::$2')).join(',')
  })
}

function populateIconDefs ({ FontAwesomeIconDefs: { includes = [], admonitionIcons = {} } }) {
  const iconDefs = [...new Set(includes)].reduce((accum, iconKey) => {
    if (accum.has(iconKey)) return accum
    const [iconPrefix, iconName] = iconKey.split(' ').slice(0, 2)
    let iconDef = (iconPacks[iconPrefix] || {})[camelCase(iconName)]
    if (iconDef) {
      return accum.set(iconKey, { ...iconDef, prefix: iconPrefix })
    } else if (iconPrefix === 'fa') {
      const [realIconPrefix, realIconName] = iconPacks.__v4__.get(iconName) || []
      if (
        realIconName &&
        !accum.has((iconKey = `${realIconPrefix} ${realIconName}`)) &&
        (iconDef = (iconPacks[realIconPrefix] || {})[camelCase(realIconName)])
      ) {
        return accum.set(iconKey, { ...iconDef, prefix: realIconPrefix })
      }
    }
    return accum
  }, new Map())
  return [
    `window.FontAwesomeIconDefs = ${JSON.stringify([...iconDefs.values()])}\n`,
    `window.FontAwesomeIconDefs.admonitionIcons = ${JSON.stringify(admonitionIcons)}\n`,
  ].join()
}

function camelCase (str) {
  return str.replace(/-(.)/g, (_, l) => l.toUpperCase())
}
