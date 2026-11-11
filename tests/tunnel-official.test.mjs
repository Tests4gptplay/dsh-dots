/** Uses the unchanged official OS binary; only OpenAI's remote queue is simulated. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdtemp, rm, access } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createTunnelController, selectTunnelAsset } from '../lib/tunnel-control.mjs'
import { startMcpServer } from '../lib/mcp-server.mjs'
const official = process.env.DOTS_TUNNEL_OFFICIAL_DIR
const listen = server => new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${server.address().port}`)) })
const close = server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve) })

test('official client installs, initializes, forwards MCP, reports health and stops', { skip: !official, timeout: 60000 }, async () => {
  const release = JSON.parse(await readFile(join(official, 'release.json'), 'utf8'))
  const asset = selectTunnelAsset(release), dir = await mkdtemp(join(tmpdir(), 'dots-official-'))
  const id = 'tunnel_' + 'a'.repeat(32), key = 'sk-only-local-test', requests = [], responses = []
  const timers = new Set()
  let sent = false, gotReply
  const received = new Promise(resolve => { gotReply = resolve })
  const remote = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname
    requests.push({ path, auth: req.headers.authorization })
    res.setHeader('content-type', 'application/json')
    if (path.endsWith('/poll')) {
      if (!sent) {
        sent = true
        res.end(JSON.stringify({ commands: [{ request_id: 'one', shard_token: 'test-shard', channel: 'main', command_type: 'jsonrpc', created_at: new Date().toISOString(), headers: { 'Mcp-Protocol-Version': ['2025-11-25'] }, jsonrpc: { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'test_echo', arguments: { value: 'official-client-forwarded' } } } }] }))
      } else {
        const timer = setTimeout(() => { timers.delete(timer); if (!res.destroyed) res.writeHead(204).end() }, 150)
        timers.add(timer)
      }
    } else if (path.endsWith('/response')) {
      let body = ''; for await (const chunk of req) body += chunk
      const parsed = JSON.parse(body); responses.push(parsed); res.end('{}'); gotReply(parsed)
    } else if (path === `/v1/tunnels/${id}`) res.end(JSON.stringify({ id, name: 'local-test' }))
    else res.writeHead(404).end('{}')
  })
  const api = await listen(remote)
  const mcpServer = await startMcpServer({ token: 'local-test-key', adapter: { tools: [{ name: 'test_echo', description: 'Local transport check', inputSchema: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] }, run: async ({ value }) => ({ value }) }] } })
  let mcpOn = true, releaseLookups = 0
  const controller = createTunnelController({ dataDir: dir, mcp: { status: () => ({ localUrl: mcpOn ? mcpServer.localUrl : '' }) },
    environment: { ...process.env, CONTROL_PLANE_BASE_URL: api },
    fetchImpl: async url => url.includes('api.github.com') ? (releaseLookups++, Response.json(release)) : new Response(await readFile(join(official, url.split('/').at(-1)))),
  })
  try {
    const installed = await controller.install()
    assert.equal(installed.installed, true); assert.equal(installed.operation, '')
    assert.equal(installed.lastDiagnosis.sha256, asset.digest.slice(7))
    const companion = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared'
    await access(join(installed.executable, '..', companion))
    const started = await controller.start({ tunnelId: id, apiKey: key })
    assert.equal(started.running, true); assert.ok(started.pid); assert.equal(started.health, null)
    const reply = await received
    assert.match(JSON.stringify(reply), /official-client-forwarded/)
    assert.ok(requests.every(request => request.auth === `Bearer ${key}`))
    const profile = await readFile(join(dir, 'tunnel-profiles/dsh-dots.yaml'), 'utf8')
    assert.ok(profile.includes(mcpServer.localUrl)); assert.ok(profile.includes('env:CONTROL_PLANE_API_KEY')); assert.ok(!profile.includes(key))
    const health = await controller.refresh(); assert.equal(health.running, true)
    assert.equal(health.health.ok, true, JSON.stringify(health.health))
    // Each click fetches the latest release, and retains just one rollback copy.
    const updated = await controller.install()
    const newest = await controller.install()
    assert.notEqual(updated.executable, installed.executable)
    assert.notEqual(newest.executable, updated.executable)
    assert.equal(releaseLookups, 3, 'Every install must resolve the latest official GitHub Release')
    await access(dirname(installed.executable)) // currently running binary is kept until stop
    const pending = await controller.status()
    assert.equal(pending.running, true)
    assert.equal(pending.pendingClientSwitch, true, 'A newer downloaded executable awaits activation')
    assert.equal(pending.runningExecutable, installed.executable)
    const switched = await controller.start()
    assert.equal(switched.running, true)
    assert.notEqual(switched.pid, started.pid, 'Start must switch from the old live client')
    assert.equal(switched.runningExecutable, newest.executable)
    assert.equal(switched.pendingClientSwitch, false)
    await assert.rejects(access(dirname(installed.executable)), { code: 'ENOENT' })
    await access(dirname(updated.executable))
    await access(dirname(newest.executable))
    const stopped = await controller.stop(); assert.equal(stopped.running, false)
    const restarted = await controller.start(); assert.equal(restarted.running, true); assert.notEqual(restarted.pid, switched.pid)
    await controller.stop(); mcpOn = false
    await assert.rejects(controller.start(), /Enable MCP/)
  } finally {
    await controller.dispose(); await mcpServer.close(); for (const timer of timers) clearTimeout(timer); await close(remote); await rm(dir, { recursive: true, force: true })
  }
})
