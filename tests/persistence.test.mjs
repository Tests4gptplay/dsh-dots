import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import {
  ORIGINAL, PATCHED, rewriteArchive, inspect, applyPersistence, restorePersistence,
  locateArchive,
} from '../src/persistence.mjs'

const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const main = [
  'var DesktopBrowserGuests = class {',
  '  acquire(owner, workspace) {',
  '    let partition = this.partitions.get(workspace);',
  '    if (partition === void 0) {',
  `      ${ORIGINAL}`,
  '      this.configureSession(session.fromPartition(partition));',
  '      this.partitions.set(workspace, partition);',
  '    }',
  '    return {lease: "opaque", partition};',
  '  }',
  '};',
  '//#endregion',
].join('\n')
function makeAsar(mainSource = main) {
  const content = Buffer.from(mainSource)
  const last = Buffer.from('UNRELATED_NON_MODIFIED_ASSET')
  const integrity = { algorithm: 'SHA256', hash: sha(content), blockSize: 128,
    blocks: [...Array(Math.ceil(content.length / 128))].map((_, i) => sha(content.subarray(i * 128, (i + 1) * 128))) }
  const header = { files: { lib: { files: { 'main.js': { offset: '0', size: content.length, integrity },
    'extra.data': { offset: String(content.length), size: last.length } } } } }
  const json = Buffer.from(JSON.stringify(header))
  const padded = (json.length + 3) & ~3
  const prefix = Buffer.alloc(16 + padded)
  prefix.writeUInt32LE(4, 0)
  prefix.writeUInt32LE(8 + padded, 4)
  prefix.writeUInt32LE(4 + padded, 8)
  prefix.writeUInt32LE(json.length, 12)
  json.copy(prefix, 16)
  return Buffer.concat([prefix, content, last])
}
function readParts(bytes) {
  const json = JSON.parse(bytes.subarray(16, 16 + bytes.readUInt32LE(12)).toString())
  const start = 8 + bytes.readUInt32LE(4)
  const m = json.files.lib.files['main.js']
  const other = json.files.lib.files['extra.data']
  return { main: bytes.subarray(start + Number(m.offset), start + Number(m.offset) + m.size),
    other: bytes.subarray(start + Number(other.offset), start + Number(other.offset) + other.size),
    metadata: m, offset: Number(other.offset) }
}
async function withArchive(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-dots-persistence-'))
  const archive = join(dir, 'app.asar')
  const source = makeAsar()
  try { await writeFile(archive, source); await fn({ dir, archive, source }) }
  finally { await rm(dir, { recursive: true, force: true }) }
}

test('before / after: DSH original loses persistent login; precise Dots-only partition replacement', async () => {
  const original = makeAsar()
  const before = readParts(original)
  assert.ok(before.main.toString().includes(ORIGINAL))
  const patched = rewriteArchive(original)
  const after = readParts(patched)
  assert.ok(after.main.toString().includes(PATCHED))
  assert.equal(after.main.toString().includes(ORIGINAL), false)
  assert.equal(after.other.toString(), before.other.toString())
  assert.equal(after.offset - before.offset, after.main.length - before.main.length)
  assert.equal(after.metadata.integrity.hash, sha(after.main))
  assert.deepEqual(after.metadata.integrity.blocks,
    [...Array(Math.ceil(after.main.length / 128))].map((_, i) => sha(after.main.subarray(i * 128, (i + 1) * 128))))
  assert.equal(rewriteArchive(patched, 'restore').toString('hex'), original.toString('hex'))
})

test('one-click apply, backup, idempotence, full original restore, no effect on other archive files', async () => {
  await withArchive(async ({ dir, archive, source }) => {
    assert.equal((await inspect({ override: archive })).state, 'available')
    const applied = await applyPersistence({ override: archive, platform: 'win32' })
    assert.equal(applied.changed, true)
    assert.equal(applied.canRestore, true)
    assert.equal((await inspect({ override: archive })).state, 'applied')
    assert.equal((await inspect({ override: archive })).canRestore, true)
    assert.ok((await readdir(dir)).some(n => n.startsWith('app.asar.before-dsh-dots-')))
    assert.equal((await applyPersistence({ override: archive })).changed, false)
    const restored = await restorePersistence({ override: archive, platform: 'win32' })
    assert.equal(restored.state, 'available')
    assert.equal(sha(await readFile(archive)), sha(source))
    assert.equal((await inspect({ override: archive })).state, 'available')
    await assert.rejects(restorePersistence({ override: archive }), /未应用/)
  })
})

test('refuse unknown host layouts and preserve original archive', async () => {
  await withArchive(async ({ archive }) => {
    const unrelated = makeAsar('var DesktopBrowserGuests = class {};\n//#endregion')
    await writeFile(archive, unrelated)
    assert.equal((await inspect({ override: archive })).state, 'incompatible')
    await assert.rejects(applyPersistence({ override: archive }), /未匹配/)
    assert.equal(sha(await readFile(archive)), sha(unrelated))
  })
})

test('do not restore from an unrelated backup', async () => {
  await withArchive(async ({ dir, archive }) => {
    await applyPersistence({ override: archive })
    const backup = (await readdir(dir)).find(n => n.startsWith('app.asar.before-dsh-dots-'))
    await writeFile(join(dir, backup), makeAsar(main.replace('opaque', 'unrelated')))
    assert.equal((await inspect({ override: archive })).canRestore, false)
    await assert.rejects(restorePersistence({ override: archive }), /找不到/)
    assert.equal((await inspect({ override: archive })).state, 'applied')
  })
})

test('locate Windows, Linux, and macOS installed app.asar without mutating any platform settings', async () => {
  const root = join(tmpdir(), 'test-install')
  assert.equal(await locateArchive({ executable: join(root, 'DeepSeek Harness.exe') }), join(root, 'resources', 'app.asar'))
  assert.equal(await locateArchive({ executable: join(root, 'electron') }), join(root, 'resources', 'app.asar'))
  assert.equal(await locateArchive({ executable: join(root, 'Demo.app', 'Contents', 'MacOS', 'Demo') }), join(root, 'Demo.app', 'Contents', 'Resources', 'app.asar'))
})

test('one-shot after-exit helper waits for IPC disconnect, then applies once and clears staged state', async () => {
  const { spawn } = await import('node:child_process')
  const { finishScheduled } = await import('../src/persistence.mjs')
  await withArchive(async ({ dir, archive, source }) => {
    const patched = rewriteArchive(source)
    const stage = join(dir, 'staged.asar')
    const manifest = `${archive}.dots-persistence-pending.json`
    await writeFile(stage, patched)
    await writeFile(manifest, JSON.stringify({ archive, stage, expectedSha: sha(source), resultSha: sha(patched), status: 'scheduled' }))
    assert.equal((await inspect({ override: archive })).state, 'scheduled')
    const child = spawn(process.execPath, [new URL('../src/persistence-after-exit.mjs', import.meta.url).pathname, manifest],
      { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] })
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject) })
    assert.equal(sha(await readFile(archive)), sha(source), 'not modified before parent quits')
    child.disconnect()
    const code = await new Promise(resolve => child.once('exit', resolve))
    assert.equal(code, 0)
    assert.equal(sha(await readFile(archive)), sha(patched))
    await assert.rejects(readFile(manifest), { code: 'ENOENT' })
    await assert.rejects(readFile(stage), { code: 'ENOENT' })
    assert.equal((await inspect({ override: archive })).state, 'applied')
    // Also check that the helper's core operation verifies the expected source.
    await assert.rejects(finishScheduled(manifest), { code: 'ENOENT' })
  })
})

test('after-exit operation refuses to replace an upgraded archive', async () => {
  const { finishScheduled } = await import('../src/persistence.mjs')
  await withArchive(async ({ dir, archive, source }) => {
    const patched = rewriteArchive(source)
    const stage = join(dir, 'staged.asar')
    const manifest = `${archive}.dots-persistence-pending.json`
    await writeFile(stage, patched)
    await writeFile(manifest, JSON.stringify({ archive, stage, expectedSha: sha(source), resultSha: sha(patched), status: 'scheduled' }))
    const upgraded = makeAsar(main.replace('opaque', 'new-version'))
    await writeFile(archive, upgraded)
    await assert.rejects(finishScheduled(manifest), /DSH 已更新/)
    assert.equal(sha(await readFile(archive)), sha(upgraded))
  })
})
