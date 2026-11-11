import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMcpController } from '../lib/mcp-control.mjs'
import { disposeDotsResources } from '../lib/host.js'
import { resultOf } from '../lib/mcp-server.mjs'
import { loadNativeClient } from './cases/load-native-client.mjs'

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'dots-mcp-lifecycle-'))
  const store = join(root, 'storage')
  await mkdir(store)
  t.after(() => rm(root, { recursive: true, force: true }))
  const ctx = { connection: { createPeer() { return { async dispose() {} } } } }
  const controller = createMcpController(ctx, { configPath: join(store, 'mcp.json') })
  t.after(() => controller.dispose())
  return { root, store, controller }
}

test('failed preference save stops MCP and accurately reports persistence failure', async t => {
  const { root, store, controller } = await fixture(t)
  const started = await controller.configure({ enabled: true })
  assert.equal(started.running, true)
  assert.equal((await controller.check()).lastCheck?.ok, true)
  const oldStore = join(root, 'storage-backup')
  await rename(store, oldStore)
  await writeFile(store, 'not-a-directory')
  await assert.rejects(controller.configure({ enabled: false }), /save|saving|ENOTDIR|EEXIST/i)
  const after = controller.status()
  assert.equal(after.enabled, false)
  assert.equal(after.running, false)
  assert.equal(after.lastCheck, null)
  assert.match(after.error, /restart/i)
  await assert.rejects(fetch(started.localUrl))
  await rm(store)
  await rename(oldStore, store)
  assert.equal(JSON.parse(await readFile(join(store, 'mcp.json'), 'utf8')).enabled, true)
  assert.equal((await controller.configure({ enabled: false })).running, false)
  assert.equal(JSON.parse(await readFile(join(store, 'mcp.json'), 'utf8')).enabled, false)
})

test('tunnel shutdown failure leaves MCP off and persists the disabled preference', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dots-mcp-tunnel-error-'))
  const configPath = join(root, 'mcp.json')
  const ctx = { connection: { createPeer() { return { async dispose() {} } } } }
  let failTunnelStop = true
  const control = createMcpController(ctx, {
    configPath,
    async onStop() { if (failTunnelStop) throw new Error('tunnel child stop failed') },
  })
  t.after(async () => { failTunnelStop = false; await control.dispose(); await rm(root, { recursive: true, force: true }) })
  const started = await control.configure({ enabled: true })
  assert.equal(started.running, true)
  await assert.rejects(control.configure({ enabled: false }), /tunnel child stop failed/)
  const state = control.status()
  assert.equal(state.enabled, false)
  assert.equal(state.running, false)
  assert.match(state.error, /tunnel child stop failed/)
  assert.equal(JSON.parse(await readFile(configPath, 'utf8')).enabled, false)
  await assert.rejects(fetch(started.localUrl))
  failTunnelStop = false
  const reloaded = createMcpController(ctx, { configPath })
  t.after(() => reloaded.dispose())
  const recovered = await reloaded.initialize()
  assert.equal(recovered.enabled, false)
  assert.equal(recovered.running, false)
})

test('host unload always releases the MCP listener and native Peer if tunnel disposal fails', async t => {
  const { controller } = await fixture(t)
  const started = await controller.configure({ enabled: true })
  const calls = []
  await assert.rejects(disposeDotsResources(
    async () => { calls.push('unregister tunnel settings') },
    async () => { calls.push('unregister MCP settings') },
    { async dispose() { calls.push('dispose tunnel'); throw new Error('native tunnel process did not stop') } },
    { async dispose() { calls.push('dispose MCP'); await controller.dispose() } },
  ), /native tunnel process did not stop/)
  assert.deepEqual(calls, ['unregister tunnel settings', 'unregister MCP settings', 'dispose tunnel', 'dispose MCP'])
  await assert.rejects(fetch(started.localUrl))
})

test('rotating the MCP key reconnects an already-running tunnel to the new local address', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dots-mcp-rotate-'))
  const ctx = { connection: { createPeer() { return { async dispose() {} } } } }
  let tunnelRunning = true, startCount = 0, connectedUrl = ''
  const controller = createMcpController(ctx, {
    configPath: join(root, 'mcp.json'),
    tunnelRunning: () => tunnelRunning,
    onStop: async () => { tunnelRunning = false },
    restartTunnel: async () => {
      startCount++
      connectedUrl = controller.status().localUrl
      tunnelRunning = true
    },
  })
  t.after(async () => { await controller.dispose(); await rm(root, { recursive: true, force: true }) })
  const first = await controller.configure({ enabled: true })
  const rotated = await controller.rotate()
  assert.notEqual(first.localUrl, rotated.localUrl)
  assert.equal(startCount, 1)
  assert.equal(connectedUrl, rotated.localUrl)
  assert.equal(tunnelRunning, true)
  assert.equal((await fetch(first.localUrl)).status, 404, 'Old path must no longer access the renewed MCP listener')
  assert.equal((await controller.check()).lastCheck.ok, true)
})

test('rotating the MCP key does not start a tunnel that was already stopped', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dots-mcp-rotate-stopped-'))
  const ctx = { connection: { createPeer() { return { async dispose() {} } } } }
  let starts = 0
  const controller = createMcpController(ctx, {
    configPath: join(root, 'mcp.json'),
    tunnelRunning: () => false,
    restartTunnel: async () => { starts++ },
  })
  t.after(async () => { await controller.dispose(); await rm(root, { recursive: true, force: true }) })
  await controller.configure({ enabled: true })
  await controller.rotate()
  assert.equal(starts, 0)
})

test('closing MCP clears prior successful local connection status', async t => {
  const { controller } = await fixture(t)
  await controller.configure({ enabled: true })
  assert.equal((await controller.check()).lastCheck?.ok, true)
  const stopped = await controller.configure({ enabled: false })
  assert.equal(stopped.running, false)
  assert.equal(stopped.lastCheck, null)
})

test('image data appears once as MCP image, retaining attachment metadata', () => {
  const encoded = Buffer.alloc(384 * 1024, 73).toString('base64')
  const source = { data: encoded, attachment: { mediaType: 'image/png', name: 'capture.png' }, marker: 'keep' }
  const result = resultOf(source)
  assert.deepEqual(result.content[1], { type: 'image', mimeType: 'image/png', data: encoded })
  assert.equal(Object.hasOwn(result.structuredContent, 'data'), false)
  assert.deepEqual(result.structuredContent.attachment, source.attachment)
  assert.equal(result.structuredContent.marker, 'keep')
  assert.equal(JSON.stringify(result).split(encoded).length - 1, 1)
  assert.equal(source.data, encoded)
})

test('non-image data and nested tool image attachments stay intact', () => {
  const ordinary = resultOf({ data: 'text-value', attachment: { mediaType: 'application/json' } })
  assert.equal(ordinary.structuredContent.data, 'text-value')
  assert.equal(ordinary.content.length, 1)
  const native = { results: [{ result: { content: [{ type: 'image', attachment: { id: 'frame', mediaType: 'image/jpeg' } }] } }] }
  Object.defineProperty(native, Symbol.for('dsh-dots.mcpContent'), { value: [{ type: 'image', data: 'YWJj', mimeType: 'image/jpeg' }] })
  const result = resultOf(native)
  assert.deepEqual(result.structuredContent.results, native.results)
  assert.deepEqual(result.content[1], { type: 'image', data: 'YWJj', mimeType: 'image/jpeg' })
})

test('Desktop guest release failure is handled at the retiring UI boundary', async () => {
  const failures = [], previousError = console.error
  console.error = (...args) => { failures.push(args.map(String).join(' ')) }
  try {
    const bridge = {
      async acquire() { return { lease: 'release-failure', partition: 'test-partition' } },
      async release() { throw new Error('native browser release failed') },
    }
    const page = await loadNativeClient({ desktopBridge: { browser: bridge } })
    await new Promise(resolve => setImmediate(resolve))
    await page.dispose()
    await new Promise(resolve => setImmediate(resolve))
    assert.ok(failures.some(text => text.includes('native browser release failed')), JSON.stringify(failures))
  } finally { console.error = previousError }
})
