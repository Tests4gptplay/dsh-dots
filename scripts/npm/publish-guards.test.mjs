import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
const here = fileURLToPath(new URL('.', import.meta.url))
function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), 'dsh-npm-guard-test-'))
  mkdirSync(join(cwd, 'npm-dist'))
  mkdirSync(join(cwd, 'release/npm'), { recursive: true })
  const bytes = Buffer.from('synthetic package bytes')
  const manifest = { name: '@tests4gptplay/dsh-dots', version: '1.0.11', filename: 'tests4gptplay-dsh-dots-1.0.11.tgz', sha256: createHash('sha256').update(bytes).digest('hex'), integrity: 'sha512-synthetic', access: 'public', tag: 'latest' }
  writeFileSync(join(cwd, 'npm-dist', manifest.filename), bytes)
  writeFileSync(join(cwd, 'npm-dist/package-verification.json'), JSON.stringify(manifest))
  for (const script of ['check-publish-request.mjs', 'check-registry.mjs']) copyFileSync(join(here, script), join(cwd, script))
  const run = (script, options = {}) => spawnSync(process.execPath, ['--input-type=module', '-e', `${options.bootstrap || ''}; await import(${JSON.stringify('./' + script)});`], { cwd, encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: join(cwd, 'outputs'), GITHUB_STEP_SUMMARY: join(cwd, 'summary') } })
  return { cwd, manifest, run }
}
test('no publication without an explicit manifest', () => {
  const f = fixture(); assert.equal(f.run('check-publish-request.mjs').status, 0)
  assert.match(readFileSync(join(f.cwd, 'outputs'), 'utf8'), /publish=false/)
})
test('exact reviewed manifest is accepted', () => {
  const f = fixture(); writeFileSync(join(f.cwd, 'release/npm/1.0.11.json'), JSON.stringify(f.manifest))
  assert.equal(f.run('check-publish-request.mjs').status, 0)
  assert.match(readFileSync(join(f.cwd, 'outputs'), 'utf8'), /publish=true/)
})
test('changed immutable package digest is refused', () => {
  const f = fixture(); writeFileSync(join(f.cwd, 'release/npm/1.0.11.json'), JSON.stringify({ ...f.manifest, sha256: 'wrong' }))
  assert.notEqual(f.run('check-publish-request.mjs').status, 0)
})
test('registry 404 is the only absent-package status', () => {
  const f = fixture()
  assert.equal(f.run('check-registry.mjs', { bootstrap: 'globalThis.fetch=async()=>({status:404,ok:false})' }).status, 0)
  assert.match(readFileSync(join(f.cwd, 'outputs'), 'utf8'), /exists=false/)
})
test('registry permission or network failures never authorize publish', () => {
  for (const status of [401, 403, 429, 500]) {
    const f = fixture()
    assert.notEqual(f.run('check-registry.mjs', { bootstrap: `globalThis.fetch=async()=>({status:${status},ok:false})` }).status, 0)
  }
})
test('an existing identical version is a safe no-op', () => {
  const f = fixture()
  const info = { name: f.manifest.name, version: f.manifest.version, dist: { integrity: f.manifest.integrity } }
  assert.equal(f.run('check-registry.mjs', { bootstrap: `globalThis.fetch=async()=>({status:200,ok:true,json:async()=>(${JSON.stringify(info)})})` }).status, 0)
  assert.match(readFileSync(join(f.cwd, 'outputs'), 'utf8'), /exists=true/)
})
test('existing different registry bytes are refused', () => {
  const f = fixture()
  const info = { name: f.manifest.name, version: f.manifest.version, dist: { integrity: 'sha512-wrong' } }
  assert.notEqual(f.run('check-registry.mjs', { bootstrap: `globalThis.fetch=async()=>({status:200,ok:true,json:async()=>(${JSON.stringify(info)})})` }).status, 0)
})
test('artifact tampering is refused before any registry request', () => {
  const f = fixture(); writeFileSync(join(f.cwd, 'npm-dist', f.manifest.filename), 'changed')
  const result = f.run('check-registry.mjs', { bootstrap: 'globalThis.fetch=async()=>{throw Error("should not fetch")}' })
  assert.notEqual(result.status, 0); assert.doesNotMatch(result.stderr, /should not fetch/)
})
