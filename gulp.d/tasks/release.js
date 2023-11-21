'use strict'

const File = require('vinyl')
const fs = require('node:fs')
const { promises: fsp } = fs
const { Octokit } = require('@octokit/rest')
const ospath = require('node:path')
const { pipeline, Transform, Writable } = require('node:stream')
const forEach = (write, final) => new Writable({ objectMode: true, write, final })
const map = (transform, flush = undefined) => new Transform({ objectMode: true, transform, flush })
const vfs = require('vinyl-fs')
const zip = require('@vscode/gulp-vinyl-zip')

function getNextReleaseNumber ({ octokit, owner, repo, tagPrefix, latestTagName }) {
  const filter = ({ name }) => name !== latestTagName && name.startsWith(tagPrefix)
  return collectReleases({ octokit, owner, repo, filter }).then((releases) => {
    if (releases.length) {
      releases.sort((a, b) => -1 * a.name.localeCompare(b.name, 'en', { numeric: true }))
      const latestName = releases[0].name
      return Number(latestName.slice(tagPrefix.length)) + 1
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
  let uiDescriptorFound
  return new Promise((resolve, reject) =>
    vfs
      .src(bundleFile)
      .pipe(zip.src().on('error', reject))
      .pipe(
        map(
          (file, _, next) => {
            if (file.path === 'ui.yml' && (uiDescriptorFound = true) && file.isStream()) {
              const buffer = []
              pipeline(
                file.contents,
                forEach((chunk, _, done) => buffer.push(chunk) && done()),
                (err) => (err ? next(err) : next(null, addVersionEntry(file, tagName, Buffer.concat(buffer))))
              )
            } else {
              next(null, file)
            }
          },
          function (done) {
            if (!uiDescriptorFound) this.push(addVersionEntry(new File({ path: 'ui.yml' }), tagName))
            done()
          }
        )
      )
      .pipe(zip.dest(bundleFile))
      .on('finish', () => resolve(bundleFile))
  )
}

function addVersionEntry (file, tagName, contents = Buffer.alloc(0)) {
  let versionEntry = `version: ${tagName}\n`
  if (contents.length && contents[contents.length - 1] !== 10) versionEntry = `\n${versionEntry}`
  file.contents = Buffer.concat([contents, Buffer.from(versionEntry)])
  return file
}

module.exports = (dest, bundleName, owner, repo, ref, token, updateBranch, latestAlias) => async () => {
  const octokit = new Octokit({ auth: `token ${token}` })
  let variant = ref ? ref.replace(/^refs\/heads\//, '') : 'main'
  if (variant === 'main') variant = 'prod'
  ref = ref.replace(/^refs\//, '')
  const tagPrefix = `${variant}-`
  const latestTagName = latestAlias === false ? undefined : `${tagPrefix}${latestAlias || 'latest'}`
  const tagName = `${tagPrefix}${await getNextReleaseNumber({ octokit, owner, repo, tagPrefix, latestTagName })}`
  const message = `Release ${tagName}`
  const bundleFileBasename = `${bundleName}-bundle.zip`
  const bundleFile = await versionBundle(ospath.join(dest, bundleFileBasename), tagName)
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
  if (latestTagName) {
    await octokit.repos.getReleaseByTag({ owner, repo, tag: latestTagName }).then(
      (result) =>
        octokit.repos
          .deleteRelease({ owner, repo, release_id: result.data.id })
          .then(() => octokit.git.deleteRef({ owner, repo, ref: `tags/${latestTagName}` }).catch(() => undefined)),
      () => undefined
    )
  }
  for (const tag of latestTagName ? [tagName, latestTagName] : [tagName]) {
    if (tag !== tagName) await new Promise((resolve) => setTimeout(resolve, 1000))
    const isLatest = tag === tagName ? 'true' : 'false'
    const uploadUrl = await octokit.repos
      .createRelease({ owner, repo, tag_name: tag, target_commitish: commit, name: tag, make_latest: isLatest })
      .then((result) => result.data.upload_url)
    await octokit.repos.uploadReleaseAsset({
      url: uploadUrl,
      data: fs.createReadStream(bundleFile),
      name: bundleFileBasename,
      headers: { 'content-length': (await fsp.stat(bundleFile)).size, 'content-type': 'application/zip' },
    })
  }
}
