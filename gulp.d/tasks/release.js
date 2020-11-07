'use strict'

const File = require('vinyl')
const fs = require('fs')
const { promises: fsp } = fs
const { Octokit } = require('@octokit/rest')
const path = require('path')
const { Transform } = require('stream')
const map = (transform, flush = undefined) => new Transform({ objectMode: true, transform, flush })
const vfs = require('vinyl-fs')
const zip = require('gulp-vinyl-zip')

function getNextReleaseNumber ({ octokit, owner, repo, variant }) {
  const prefix = `${variant}-`
  const filter = (entry) => entry.name.startsWith(prefix)
  return collectReleases({ octokit, owner, repo, filter }).then((releases) => {
    if (releases.length) {
      releases.sort((a, b) => -1 * a.name.localeCompare(b.name, 'en', { numeric: true }))
      const latestName = releases[0].name
      return Number(latestName.slice(prefix.length)) + 1
    } else {
      return 1
    }
  })
}

function collectReleases ({ octokit, owner, repo, filter, page = 1, accum = [] }) {
  return octokit.repos.listReleases({ owner, repo, page, per_page: 100 }).then((result) => {
    const releases = result.data.filter(filter)
    const links = result.headers.link
    if (links && links.includes('; rel="next"')) {
      return collectReleases({ octokit, owner, repo, filter, page: page + 1, accum: accum.concat(releases) })
    } else {
      return accum.concat(releases)
    }
  })
}

function versionBundle (bundleFile, tagName) {
  return new Promise((resolve, reject) =>
    vfs
      .src(bundleFile)
      .pipe(zip.src().on('error', reject))
      .pipe(
        map(
          (file, enc, next) => next(null, file),
          function (done) {
            this.push(new File({ path: 'ui.yml', contents: Buffer.from(`version: ${tagName}\n`) }))
            done()
          }
        )
      )
      .pipe(zip.dest(bundleFile))
      .on('finish', () => resolve(bundleFile))
  )
}

module.exports = (dest, bundleName, owner, repo, ref, token, updateBranch) => async () => {
  const octokit = new Octokit({ auth: `token ${token}` })
  let variant = ref.replace(/^refs\/heads\//, '')
  if (variant === 'main') variant = 'prod'
  ref = ref.replace(/^refs\//, '')
  const tagName = `${variant}-${await getNextReleaseNumber({ octokit, owner, repo, variant })}`
  const message = `Release ${tagName}`
  const bundleFileBasename = `${bundleName}-bundle.zip`
  const bundleFile = await versionBundle(path.join(dest, bundleFileBasename), tagName)
  let commit = await octokit.git.getRef({ owner, repo, ref }).then((result) => result.data.object.sha)
  const readmeContent = await fsp
    .readFile('README.adoc', 'utf-8')
    .then((contents) => contents.replace(/^(?:\/\/)?(:current-release: ).+$/m, `$1${tagName}`))
  const readmeBlob = await octokit.git
    .createBlob({ owner, repo, content: readmeContent, encoding: 'utf-8' })
    .then((result) => result.data.sha)
  let tree = await octokit.git.getCommit({ owner, repo, commit_sha: commit }).then((result) => result.data.tree.sha)
  tree = await octokit.git
    .createTree({
      owner,
      repo,
      tree: [{ path: 'README.adoc', mode: '100644', type: 'blob', sha: readmeBlob }],
      base_tree: tree,
    })
    .then((result) => result.data.sha)
  commit = await octokit.git
    .createCommit({ owner, repo, message, tree, parents: [commit] })
    .then((result) => result.data.sha)
  if (updateBranch) await octokit.git.updateRef({ owner, repo, ref, sha: commit })
  const uploadUrl = await octokit.repos
    .createRelease({
      owner,
      repo,
      tag_name: tagName,
      target_commitish: commit,
      name: tagName,
    })
    .then((result) => result.data.upload_url)
  await octokit.repos.uploadReleaseAsset({
    url: uploadUrl,
    data: fs.createReadStream(bundleFile),
    name: bundleFileBasename,
    headers: {
      'content-length': (await fsp.stat(bundleFile)).size,
      'content-type': 'application/zip',
    },
  })
}
