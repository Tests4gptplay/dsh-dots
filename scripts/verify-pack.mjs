/** Validate the distributable package, not merely the presence of source code. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const expected = [
  'LICENSE', 'README.en.md', 'README.md', 'CHANGELOG.md',
  'assets/dots-ring.svg', 'cordis.patch.yml',
  'lib/client.js', 'lib/host.js', 'locale/en.json', 'locale/zh.json',
  'package.json',
].sort()
const proc = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['pack', '--dry-run', '--ignore-scripts', '--json'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' })
if (proc.error) throw proc.error
assert.equal(proc.status, 0, `npm pack failed: ${proc.stderr}`)
let metadata
try { metadata = JSON.parse(proc.stdout)[0] }
catch { throw new Error(`npm pack JSON was malformed: ${proc.stdout.slice(0, 500)}`) }
const actual = metadata.files.map(f => f.path).sort()
assert.deepEqual(actual, expected, 'Distribution must include exactly the runtime whitelist; no tests, source or Mock Dot files')
assert.equal(metadata.name, manifest.name)
assert.equal(metadata.version, manifest.version)
assert.equal(manifest.engines, undefined, 'Do not constrain installation by Node engine version')
assert.equal(metadata.filename, `${manifest.name}-${manifest.version}.tgz`)
for (const field of ['dependencies', 'optionalDependencies']) {
  assert.ok(!Object.hasOwn(manifest[field] ?? {}, manifest.name),
    `Plugin ${manifest.name} must not depend on itself through ${field}`)
}
assert.equal(manifest.main, './lib/host.js')
assert.equal(manifest.exports['./client'], './lib/client.js')
assert.equal(manifest.exports['./locale/*.json'], './locale/*.json')
assert.equal(manifest.icon, './assets/dots-ring.svg')
assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml')
assert.equal(manifest.dsh?.client?.platform, 'web')
for (const key of Object.keys(manifest.peerDependencies ?? {})) {
  if (key.startsWith('@deepseek-ai/')) assert.equal(manifest.peerDependencies[key], '*', 'Do not block by DSH version string')
}
for (const locale of ['zh', 'en']) {
  const value = JSON.parse(await readFile(new URL(`../locale/${locale}.json`, import.meta.url), 'utf8'))
  assert.ok(value.meta?.title?.trim(), `${locale} missing plugin-manager title`)
  assert.ok(value.meta?.description?.trim(), `${locale} missing plugin-manager description`)
}
const compiled = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
assert.match(compiled, /window\.__ModuleLoader__\.load/, 'Compiled DSH client loader missing')
assert.match(compiled, /sidebar\.panellist/, 'Compiled sidebar slot missing')
const host = await readFile(new URL('../lib/host.js', import.meta.url), 'utf8')
assert.match(host, /dsh-dots/, 'Compiled host entry missing')
console.log(`PASS: ${metadata.filename} — ${actual.length} approved package files; native entries and zh/en metadata present.`)
