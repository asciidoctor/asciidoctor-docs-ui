'use strict'

const fs = require('fs')
const { Transform } = require('stream')
const map = (transform) => new Transform({ objectMode: true, transform })
const vfs = require('vinyl-fs')

module.exports = (files) => () =>
  vfs.src(files, { allowEmpty: true }).pipe(map((file, enc, next) => fs.rm(file.path, { recursive: true }, next)))
