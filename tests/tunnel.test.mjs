import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm, access, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { zipSync, strToU8 } from 'fflate'
import { createTunnelController, selectTunnelAsset, redactTunnelText, extractTunnelArchive, registerTunnelTransport, pruneTunnelInstallations } from '../lib/tunnel-control.mjs'

async function fixture(t, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'dots-tunnel-test-'))
  const controller = createTunnelController({ dataDir: dir, mcp: { status: () => ({ localUrl: '' }) }, environment: {}, ...options })
  t.after(async () => { await controller.dispose(); await rm(dir, { recursive: true, force: true }) })
  return { dir, controller }
}
const release = { tag_name: 'v0.0.20', assets: ['windows-amd64', 'linux-amd64', 'darwin-arm64'].map(platform => ({ name: `tunnel-client-v0.0.20-${platform}.zip` })) }
test('tunnel defaults to a profile-owned directory and does not launch or download', async t => {
  const { dir, controller } = await fixture(t, { fetchImpl() { throw new Error('Unexpected background network request') } })
  const state = await controller.status()
  assert.equal(state.installDirectory, join(dir, 'tunnel-client')); assert.equal(state.running, false); assert.equal(state.keyAvailable, false)
})
test('official asset selection follows platform and CPU without selecting runtime-only archive', () => {
  assert.equal(selectTunnelAsset(release, 'win32', 'x64').name, 'tunnel-client-v0.0.20-windows-amd64.zip')
  assert.equal(selectTunnelAsset(release, 'linux', 'x64').name, 'tunnel-client-v0.0.20-linux-amd64.zip')
  assert.equal(selectTunnelAsset(release, 'darwin', 'arm64').name, 'tunnel-client-v0.0.20-darwin-arm64.zip')
})
test('unavailable official platform gives the existing-executable option', () => {
  assert.throws(() => selectTunnelAsset(release, 'linux', 'arm64'), /existing tunnel-client executable/)
})
test('selected path and complete tunnel ID persist but runtime key is never saved or returned', async t => {
  const { dir, controller } = await fixture(t)
  const tunnelId = 'tunnel_ab12_' + 'a'.repeat(32)
  const state = await controller.configure({ installDirectory: join(dir, 'custom location'), executable: join(dir, 'existing-client'), tunnelId, apiKey: 'sk-transient-test-key' })
  const text = await readFile(join(dir, 'tunnel.json'), 'utf8')
  assert.equal(state.tunnelId, tunnelId); assert.equal(state.keyAvailable, true)
  assert.ok(!text.includes('sk-transient')); assert.ok(!JSON.stringify(state).includes('sk-transient'))
  const second = createTunnelController({ dataDir: dir, mcp: { status: () => ({}) }, environment: {} })
  try { assert.equal((await second.status()).tunnelId, tunnelId); assert.equal((await second.status()).keyAvailable, false) } finally { await second.dispose() }
})
test('log redaction removes runtime keys and complete local MCP access path', () => {
  const result = redactTunnelText('key=sk-private; http://localhost/mcp/local-secret and explicit', ['explicit'])
  assert.doesNotMatch(result, /sk-private|local-secret|explicit/)
})
test('official archive keeps binary, companion and license under chosen directory', async t => {
  const { dir } = await fixture(t)
  const bytes = zipSync({ 'tunnel-client.exe': strToU8('exe'), 'cloudflared.exe': strToU8('companion'), 'LICENSE': strToU8('MIT') })
  await extractTunnelArchive(bytes, join(dir, 'installation'))
  assert.equal(await readFile(join(dir, 'installation', 'cloudflared.exe'), 'utf8'), 'companion')
  assert.equal(await readFile(join(dir, 'installation', 'LICENSE'), 'utf8'), 'MIT')
})
test('archive entries cannot escape the selected installation directory', async t => {
  const { dir } = await fixture(t)
  await assert.rejects(extractTunnelArchive(zipSync({ '../outside': strToU8('unexpected') }), join(dir, 'inside')), /outside the installation/)
  await assert.rejects(access(join(dir, 'outside')))
})
test('checksum failure preserves the existing executable', async t => {
  const metadata = { tag_name: 'v0.0.20', assets: [{ name: 'tunnel-client-v0.0.20-linux-amd64.zip', digest: 'sha256:' + '0'.repeat(64), browser_download_url: 'https://github.com/openai/tunnel-client/releases/download/v0.0.20/tunnel-client-v0.0.20-linux-amd64.zip' }] }
  const { dir, controller } = await fixture(t, { platform: 'linux', arch: 'x64', fetchImpl: async url => url.includes('api.github') ? Response.json(metadata) : new Response('broken-download') })
  const existing = join(dir, 'existing'); await writeFile(existing, 'keep')
  await controller.configure({ executable: existing })
  await assert.rejects(controller.install(), /SHA-256/)
  assert.equal(await readFile(existing, 'utf8'), 'keep'); assert.equal((await controller.status()).executable, existing)
})
test('stop cancels an in-progress download without waiting for it', async t => {
  let entered, received; const ready = new Promise(resolve => { entered = resolve })
  const { controller } = await fixture(t, { fetchImpl: async (_url, { signal }) => { received = signal; entered(); return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })) } })
  const installing = controller.install(); const rejected = assert.rejects(installing)
  await ready; const state = await controller.stop(); assert.equal(received.aborted, true); assert.equal(state.running, false); await rejected
  assert.equal((await controller.status()).operation, '')
})
test('tunnel operations register only on DSH authenticated UI transport', async () => {
  const routes = [], calls = [], connection = { fetch: { register(route) { routes.push(route); return () => {} } } }
  const undo = registerTunnelTransport(connection, { status: async () => ({ running: false }), start: async payload => { calls.push(payload); return { running: true } } })
  const route = routes.find(r => r.path.endsWith('/start'))
  assert.ok(routes.every(route => route.path.startsWith('/api/dsh-dots-tunnel/')))
  const response = await route.fetch(new Request('http://localhost' + route.path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', method: 'dsh-dots-tunnel/start', rpcId: 'test', payload: { tunnelId: 'provided' } }) }))
  assert.equal((await response.json()).result.ok, true); assert.equal(calls[0].tunnelId, 'provided'); await undo()
})

test('an immediate stop cancels start before asynchronous configuration can launch a process', async t => {
  let spawned = false
  const { controller } = await fixture(t, { spawnImpl() { spawned = true; throw new Error('Unexpected spawn') } })
  const starting = controller.start({ tunnelId: 'opaque-user-id', executable: join(tmpdir(), 'client') })
  const failed = assert.rejects(starting)
  await controller.stop(); await failed
  assert.equal(spawned, false); assert.equal((await controller.status()).running, false)
})
test('host lifecycle stop does not require parsing tunnel settings', async t => {
  const { dir, controller } = await fixture(t)
  await writeFile(join(dir, 'tunnel.json'), 'invalid json')
  await controller.suspend()
})

test('installer cleanup keeps current plus one previous copy, preserves a running client until stop, and leaves unrelated folders untouched', async t => {
  const { dir } = await fixture(t)
  const root = join(dir, 'tunnel-client')
  const names = ['v0.0.18-linux-x64-11111111', 'v0.0.19-linux-x64-22222222', 'v0.0.20-linux-x64-33333333', 'v0.0.20-linux-x64-44444444']
  for (const name of names) {
    await mkdir(join(root, name), { recursive: true })
    await writeFile(join(root, name, 'tunnel-client'), 'official-client')
  }
  await mkdir(join(root, 'custom-user-directory'))
  await writeFile(join(root, 'custom-user-directory', 'notes.txt'), 'keep user data')
  const active = join(root, names[3], 'tunnel-client'), previous = join(root, names[2], 'tunnel-client')
  const running = join(root, names[1], 'tunnel-client')
  const removedWhileRunning = await pruneTunnelInstallations(root, active, previous, running)
  assert.deepEqual(removedWhileRunning.map(p => p.split('/').at(-1)), [names[0]])
  await access(running)
  const removedAfterStop = await pruneTunnelInstallations(root, active, previous)
  assert.deepEqual(removedAfterStop.map(p => p.split('/').at(-1)), [names[1]])
  const folders = (await readdir(root)).sort()
  assert.deepEqual(folders, [names[2], names[3], 'custom-user-directory'].sort())
  assert.equal(await readFile(join(root, 'custom-user-directory', 'notes.txt'), 'utf8'), 'keep user data')
})
