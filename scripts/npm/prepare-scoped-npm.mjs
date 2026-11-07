import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const output = resolve(process.argv[2] || 'npm-dist')
assert.notEqual(output, root)
mkdirSync(output, { recursive: true })
const source = JSON.parse(readFileSync('package.json', 'utf8'))
const clients = {
  'dsh-dots': 'lib/client.js',
  'dsh-video-vision': 'client.js',
  'dsh-kujira-persona': 'pet/client.js',
  'dsh-codex-native': 'lib/client.js',
  'dsh-compaction-selector': 'client.js',
}
const oldName = source.name
assert.ok(Object.hasOwn(clients, oldName), 'Only the five approved source packages are supported')
const newName = `@tests4gptplay/${oldName}`
assert.equal(source.repository.url, `git+https://github.com/Tests4gptplay/${oldName}.git`)
for (const hook of ['preinstall', 'install', 'postinstall', 'prepare', 'prepublishOnly']) {
  assert.equal(source.scripts?.[hook], undefined, `Unexpected lifecycle hook: ${hook}`)
}
const temp = mkdtempSync(join(tmpdir(), 'dsh-scoped-npm-'))
const pack = (cwd, destination) => JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', destination], { cwd, encoding: 'utf8' }))[0]
const original = pack(root, temp)
const archive = join(temp, original.filename)
const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n')
assert.ok(entries.every(path => path.startsWith('package/') && !path.split('/').includes('..')))
execFileSync('tar', ['-xzf', archive, '-C', temp])
const staged = join(temp, 'package')
const expected = new Map()
for (const item of original.files) {
  assert.ok(!/^(?:test(?:s|-artifacts)?|src|\.github|node_modules|docs\/(?:testing|development))\//.test(item.path), `Development file in package: ${item.path}`)
  assert.ok(!/(?:^|\/)\.(?:npmrc|env)(?:\.|$)/.test(item.path), `Private configuration in package: ${item.path}`)
  expected.set(item.path, readFileSync(join(staged, item.path)))
  chmodSync(join(staged, item.path), 0o644)
}
const replace = (path, before, after, expectedCount = 1) => {
  const value = readFileSync(join(staged, path), 'utf8')
  assert.equal(value.split(before).length - 1, expectedCount, `Unexpected match count in ${path}`)
  const updated = value.replaceAll(before, after)
  writeFileSync(join(staged, path), updated)
  expected.set(path, Buffer.from(updated))
}
const manifest = JSON.parse(JSON.stringify(source))
manifest.name = newName
if (manifest.private === true) manifest.private = false
manifest.publishConfig = { ...manifest.publishConfig, access: 'public', registry: 'https://registry.npmjs.org/' }
const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
writeFileSync(join(staged, 'package.json'), manifestBytes)
expected.set('package.json', manifestBytes)
replace('cordis.patch.yml', `name: ${oldName}`, `name: '${newName}'`)
if (oldName === 'dsh-compaction-selector') replace('cordis.patch.yml', `'${oldName}/engine'`, `'${newName}/engine'`)
const client = clients[oldName]
const code = readFileSync(join(staged, client), 'utf8')
const identity = code.match(/(?:^|[\s{,])id\s*:\s*(['"])(dsh-[a-z-]+)\1/)
assert.ok(identity && identity[2] === oldName, 'Expected client registration was not found')
replace(client, identity[0], identity[0].replace(oldName, newName))
let registered
vm.runInNewContext(readFileSync(join(staged, client), 'utf8'), { window: { __ModuleLoader__: { load(value) { registered = value.id } } } }, { timeout: 1000 })
assert.equal(registered, newName, 'Client must register under the npm package identity')
// Keep the established release-package exclusion of website-only validation notes.
if (oldName === 'dsh-kujira-persona') {
  const value = readFileSync(join(staged, 'README.md'), 'utf8')
  const matches = value.match(/<!-- ACCOUNT-VALIDATION-WEB-ONLY:START -->[\s\S]*?<!-- ACCOUNT-VALIDATION-WEB-ONLY:END -->\r?\n?/g)
  assert.equal(matches?.length, 1, 'Expected one website-only validation section')
  replace('README.md', matches[0], '')
}
for (const [path, bytes] of expected) assert.deepEqual(readFileSync(join(staged, path)), bytes, path)
const built = pack(staged, output)
assert.equal(built.name, newName)
assert.equal(built.version, source.version)
assert.deepEqual(built.files.map(f => f.path).sort(), [...expected.keys()].sort(), 'Scoped package file list drifted')
const finalFile = join(output, built.filename)
const verified = join(temp, 'verified')
mkdirSync(verified)
execFileSync('tar', ['-xzf', finalFile, '-C', verified])
for (const [path, bytes] of expected) assert.deepEqual(readFileSync(join(verified, 'package', path)), bytes, `Packed bytes differ: ${path}`)
const digest = createHash('sha256').update(readFileSync(finalFile)).digest('hex')
const summary = { name: newName, version: source.version, filename: built.filename, sha256: digest, integrity: built.integrity, size: built.size, files: built.files.length, sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), identityChanges: ['package.json', 'cordis.patch.yml', client], readmePolicy: oldName === 'dsh-kujira-persona' ? 'Existing release exclusion of website-only validation section' : 'Byte-identical to source' }
writeFileSync(join(output, 'package-verification.json'), JSON.stringify(summary, null, 2) + '\n')
writeFileSync(join(output, 'SHA256SUMS'), `${digest}  ${built.filename}\n`)
console.log(JSON.stringify(summary, null, 2))
