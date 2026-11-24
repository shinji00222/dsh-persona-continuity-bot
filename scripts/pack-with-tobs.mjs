#!/usr/bin/env node
// Build one DSH package that ships persona continuity together with the Tobs Bot mode.
//
// The Tobs fork is built separately and leaves its packages in
// tobs-persona-continuity/dist/continuity-desktop. This script picks the newest
// deepseekbot build there, merges its cordis patch into ours, points the
// @botharness/* dependencies at copies of the matching tarballs and packs the
// result as dist/dsh-persona-continuity-<version>-with-tobs.tgz.
//
// Override the Tobs build folder with TOBS_DIST=<dir>.
import { execSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tobsDist = resolve(process.env.TOBS_DIST ?? join(root, '..', 'tobs-persona-continuity', 'dist', 'continuity-desktop'))
const outDir = join(root, 'dist')
const tobsPackages = ['core', 'ui', 'browser', 'computer']

function fail(message) {
  console.error(`pack-with-tobs: ${message}`)
  process.exit(1)
}

function newestVersion(prefix) {
  if (!existsSync(tobsDist)) fail(`Tobs build folder not found: ${tobsDist}`)
  const pattern = new RegExp(`^${prefix}-(\\d.*)\\.tgz$`)
  const versions = readdirSync(tobsDist).map(file => file.match(pattern)?.[1]).filter(Boolean)
  if (!versions.length) fail(`no ${prefix}-*.tgz in ${tobsDist}`)
  return versions.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).at(-1)
}

const tobsVersion = newestVersion('deepseekbot')
const tarballs = Object.fromEntries(tobsPackages.map(name => {
  const file = join(tobsDist, `botharness-${name}-${tobsVersion}.tgz`)
  if (!existsSync(file)) fail(`missing ${file}; rebuild Tobs ${tobsVersion} first`)
  return [name, file]
}))

const staging = mkdtempSync(join(tmpdir(), 'persona-tobs-'))
try {
  // Pull the Tobs patch and license out of the deepseekbot package.
  const botDir = join(staging, 'bot')
  mkdirSync(botDir)
  execSync(`tar -xzf "${join(tobsDist, `deepseekbot-${tobsVersion}.tgz`)}" -C "${botDir}"`)
  const botPatch = readFileSync(join(botDir, 'package', 'cordis.patch.yml'), 'utf8')

  // Stage our own published files.
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const pkgDir = join(staging, 'pkg')
  mkdirSync(pkgDir)
  for (const entry of pkg.files) cpSync(join(root, entry), join(pkgDir, entry), { recursive: true })
  copyFileSync(join(botDir, 'package', 'LICENSE'), join(pkgDir, 'LICENSE-tobs'))

  // Keep the Tobs tarballs next to the output so the file: dependencies stay valid.
  const vendorDir = join(outDir, `tobs-${tobsVersion}`)
  mkdirSync(vendorDir, { recursive: true })
  const dependencies = { ...pkg.dependencies }
  for (const [name, file] of Object.entries(tarballs)) {
    const target = join(vendorDir, `botharness-${name}-${tobsVersion}.tgz`)
    copyFileSync(file, target)
    dependencies[`@botharness/${name}`] = `file:${target.replaceAll('\\', '/')}`
  }

  const ownPatch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8').trimEnd()
  writeFileSync(join(pkgDir, 'cordis.patch.yml'),
    `${ownPatch}\n\n# Tobs Bot mode, copied from deepseekbot ${tobsVersion}.\n${botPatch}`)

  writeFileSync(join(pkgDir, 'package.json'), `${JSON.stringify({
    ...pkg,
    description: `${pkg.description} Includes the Tobs Bot mode (deepseekbot ${tobsVersion}).`,
    files: [...pkg.files, 'LICENSE-tobs'],
    dependencies,
    scripts: undefined,
    dsh: { ...pkg.dsh, tobs: tobsVersion },
  }, null, 2)}\n`)

  // Pack inside staging so the standalone tarball of the same version is left alone.
  const packed = execSync(`npm pack --silent --pack-destination "${staging}"`, { cwd: pkgDir, encoding: 'utf8' })
    .trim().split(/\r?\n/).at(-1)
  const result = join(outDir, packed.replace(/\.tgz$/, '-with-tobs.tgz'))
  copyFileSync(join(staging, packed), result)
  console.log(result)
} finally {
  rmSync(staging, { recursive: true, force: true })
}
