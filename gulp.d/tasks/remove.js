'use strict'

const { promises: fsp } = require('fs')
const { Transform } = require('stream')
const ospath = require('path')
const map = (transform) => new Transform({ objectMode: true, transform })
const vfs = require('vinyl-fs')

module.exports = (files) => () =>
  vfs.src(files, { allowEmpty: true }).pipe(map((file, enc, next) => remove(file.path, next)))

function remove (dir, cb) {
  return rmdir(dir).then(cb).catch(cb)
}

/**
 * Removes the specified directory (including all of its contents) or file.
 * Equivalent to fs.promises.rmdir(dir, { recursive: true }) in Node 12.
 */
function rmdir (dir) {
  return fsp
    .readdir(dir, { withFileTypes: true })
    .then((lst) =>
      Promise.all(
        lst.map((it) =>
          it.isDirectory()
            ? rmdir(ospath.join(dir, it.name))
            : fsp.unlink(ospath.join(dir, it.name)).catch((unlinkErr) => {
              if (unlinkErr.code !== 'ENOENT') throw unlinkErr
            })
        )
      )
    )
    .then(() => fsp.rmdir(dir))
    .catch((err) => {
      if (err.code === 'ENOENT') return
      if (err.code === 'ENOTDIR') {
        return fsp.unlink(dir).catch((unlinkErr) => {
          if (unlinkErr.code !== 'ENOENT') throw unlinkErr
        })
      }
      throw err
    })
}
