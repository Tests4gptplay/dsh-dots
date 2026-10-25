/** Market readiness checks for awesome-dsh-plugin's documented entry rules.
 * Actual GitHub repository age/topics and real Dots account access are external gates.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = new URL('../', import.meta.url)
const text = path => readFile(new URL(path, root), 'utf8')
const bytes = path => readFile(new URL(path, root))

test('market: actual DSH bundle manifest and source-loadable production entries', async () => {
  const manifest = JSON.parse(await text('package.json'))
  assert.equal(manifest.name, 'dsh-dots')
  assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml')
  const patch = await text('cordis.patch.yml')
  assert.match(patch, /id:\s*dsh-dots/)
  assert.match(patch, /name:\s*dsh-dots/)
  for (const p of ['lib/client.js', 'lib/host.js', 'assets/dots-ring.svg']) {
    assert.ok((await bytes(p)).length > 0, `${p} is missing or empty`)
  }
  for (const forbidden of ['preinstall','install','postinstall','prepare']) {
    assert.equal(manifest.scripts?.[forbidden], undefined, `${forbidden} must not run on install`)
  }
  for (const [name] of Object.entries(manifest.dependencies ?? {})) {
    assert.ok(!name.startsWith('@deepseek-ai/'), `DSH-owned package ${name} should be a peer`)
  }
  assert.equal(manifest.repository?.url, 'git+https://github.com/Tests4gptplay/dsh-dots.git')
})

test('market: Chinese + English metadata and transparent attribution of browser-only feature', async () => {
  const zh = JSON.parse(await text('locale/zh.json'))
  const en = JSON.parse(await text('locale/en.json'))
  for (const locale of [zh,en]) {
    assert.ok(locale.meta?.title?.trim())
    assert.ok(locale.meta?.description?.trim())
  }
  const readme = await text('README.md')
  const english = await text('README.en.md')
  assert.match(readme, /https:\/\/chatgpt\.com\/dots\/home/)
  assert.match(english, /https:\/\/chatgpt\.com\/dots\/home/)
  assert.match(readme, /模拟|嵌入|iframe/i)
  assert.match(english, /mock|embedding|iframe/i)
})

test('market: GitHub-hostable raster tile is square and mock screenshots are not advertised as real Dots', async () => {
  const tile = await bytes('assets/dots-market-icon.png')
  assert.equal(tile.subarray(0,8).toString('hex'),'89504e470d0a1a0a')
  assert.equal(tile.toString('ascii',12,16),'IHDR')
  assert.equal(tile.readUInt32BE(16),256)
  assert.equal(tile.readUInt32BE(20),256)
  const manifest = JSON.parse(await text('package.json'))
  // Market tile can stay in GitHub without unnecessarily shipping it in the plugin TGZ.
  assert.ok(!manifest.files?.includes('assets/dots-market-icon.png'))
  // No screenshot manifest yet: the only screenshots are explicitly marked Mock Dot evidence.
  await assert.rejects(readFile(new URL('screenshots.json',root),'utf8'),{code:'ENOENT'})
  const cases = await text('docs/TEST-CASES.md')
  assert.match(cases, /不代表.*真实.*Dots|不等于真实.*Dots/i)
})
