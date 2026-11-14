import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMcpController } from '../lib/mcp-control.mjs'
import { startMcpServer } from '../lib/mcp-server.mjs'

async function controller(t) {
  const dir = await mkdtemp(join(tmpdir(), 'dot-mcp-request-state-'))
  const ctx = {
    typert: { local: { list: () => [] } },
    typertGateway: { async invoke() { return {} } },
    connection: { createPeer() { return { async dispose() {} } } },
  }
  const control = createMcpController(ctx, { configPath: join(dir, 'mcp.json') })
  t.after(async () => { await control.dispose(); await rm(dir, { recursive: true, force: true }) })
  return control
}
const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' }
function payload(text) {
  if (text.startsWith('{')) return JSON.parse(text)
  return JSON.parse(text.split('\n').find(line => line.startsWith('data: ')).slice(6))
}

test('empty OAuth discovery POST does not become a persistent connection error', async t => {
  const control = await controller(t)
  const started = await control.configure({ enabled: true })
  const probe = await fetch(started.localUrl, { method: 'POST', headers: { accept: 'application/json' } })
  assert.equal(probe.status, 415)
  assert.match((await probe.json()).error.message, /Content-Type must be application\/json/)
  assert.equal(control.status().running, true)
  assert.equal(control.status().error, '', 'request rejection must not be stored as a listener failure')
  const checked = await control.check()
  assert.equal(checked.lastCheck.ok, true)
  assert.equal(checked.error, '')
})

test('native tool failures retain their error result and last-call evidence', async t => {
  const calls = [], listenerErrors = []
  const server = await startMcpServer({ token: 'request-state-test',
    adapter: { tools: [{ name: 'fail', description: 'Return a native error', inputSchema: { type: 'object', properties: {} },
      run() { throw new Error('native operation failed') } }] },
    onCall: call => calls.push(call), onError: error => listenerErrors.push(error),
  })
  t.after(() => server.close())
  const response = await fetch(server.localUrl, { method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'fail', arguments: {} } }) })
  const result = payload(await response.text()).result
  assert.equal(result.isError, true)
  assert.equal(result.structuredContent.error.message, 'native operation failed')
  assert.equal(calls.at(-1).ok, false)
  assert.equal(calls.at(-1).error, 'native operation failed')
  assert.deepEqual(listenerErrors, [])
})

test('actual listen failures still appear as connection errors', async t => {
  const occupied = createServer()
  await new Promise((resolve, reject) => { occupied.once('error', reject); occupied.listen(0, '127.0.0.1', resolve) })
  t.after(() => new Promise((resolve, reject) => occupied.close(error => error ? reject(error) : resolve())))
  const control = await controller(t)
  await assert.rejects(control.configure({ enabled: true, port: occupied.address().port }), /EADDRINUSE/)
  assert.equal(control.status().running, false)
  assert.equal(control.status().state, 'error')
  assert.match(control.status().error, /EADDRINUSE/)
})
