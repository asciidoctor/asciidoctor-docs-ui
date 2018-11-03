'use strict'

const connect = require('gulp-connect')
const path = require('path')
const gulp = require('gulp')

const build = require('./tasks/build')
const buildPreview = require('./tasks/build-preview')
const format = require('./tasks/format')
const lintCss = require('./tasks/lint-css')
const lintJs = require('./tasks/lint-js')
const pack = require('./tasks/pack')
const preview = require('./tasks/preview')
const release = require('./tasks/release')

const pkg = require('./package.json')

const [, owner, repo] = pkg.repository.url.match(/^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/)
const bundleName = 'ui'
const buildDir = process.env.CONTEXT === 'deploy-preview' ? 'public/dist' : 'build'
const previewSiteSrcDir = 'preview-site-src'
const previewSiteDestDir = 'public'
const srcDir = 'src'
const destDir = path.join(previewSiteDestDir, '_')

const cssFiles = [path.join(srcDir, 'css/**/*.css')]
const jsFiles = ['gulpfile.js', 'tasks/**/*.js', path.join(srcDir, '{helpers,js}/**/*.js')]

gulp.task('lint:css', () => lintCss(cssFiles))
gulp.task('lint:js', () => lintJs(jsFiles))
gulp.task('lint', ['lint:css', 'lint:js'])

gulp.task('format', () => format(jsFiles))

gulp.task('build', () => build(srcDir, destDir))

gulp.task('build:preview', ['build'], () =>
  buildPreview(srcDir, destDir, previewSiteSrcDir, previewSiteDestDir, connect.reload)
)

gulp.task('preview', ['build:preview'], () =>
  preview(previewSiteDestDir, {
    port: 5252,
    livereload: process.env.LIVERELOAD === 'true',
    watch: {
      src: [srcDir, previewSiteSrcDir],
      onChange: () => gulp.start('build:preview'),
    },
  })
)

gulp.task('pack', ['build', 'lint'], () => pack(destDir, buildDir, bundleName))

gulp.task('release', ['pack'], () => release(buildDir, bundleName, owner, repo, process.env.GITHUB_TOKEN))

gulp.task('default', ['build'])
