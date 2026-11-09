/** Bridge regression cases run against the compiled, packaged protocol implementation. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { startMcpServer, makeHandler } from '../lib/mcp-server.mjs'
import { createDshAdapter } from '../lib/mcp-adapter.mjs'
import { createMcpController, validatePreferences } from '../lib/mcp-control.mjs'

const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' }
let serial = 0
const message = (name, args) => ({ jsonrpc: '2.0', id: ++serial, method: 'tools/call', params: { name, arguments: args } })
const unpack = text => { try { return JSON.parse(text) } catch { return JSON.parse(text.split('\n').find(line => line.startsWith('data: ')).slice(6)) } }
async function rpc(url, name, args) {
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(message(name, args)) })
  return { status: response.status, body: unpack(await response.text()) }
}
function environment() {
  const calls = []
  const ctx = {
    typert: { local: { list: () => [] } },
    typertGateway: { async invoke(request) { calls.push(request); return request.args } },
    connection: { createPeer: () => ({ async dispose() {} }) },
  }
  return { ctx, calls }
}
async function fixture(t) {
  const env = environment()
  const adapter = createDshAdapter(env.ctx, {})
  const server = await startMcpServer({ adapter, token: 'bridge-test' })
  t.after(() => server.close())
  return { ...env, adapter, server }
}
async function controller(t, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'dots-bridge-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const env = environment(), configPath = join(dir, 'mcp.json')
  const control = createMcpController(env.ctx, { configPath, ...options })
  t.after(() => control.dispose())
  return { ...env, dir, configPath, control }
}
for (const [name, args] of [
  ['dsh_session_wait', { sessionId: 'native-session', afterSeq: -1 }],
  ['dsh_session_events', { sessionId: 'native-session', throughSeq: -1 }],
]) test(`${name} preserves the native -1 cursor`, async t => {
  const { server, calls } = await fixture(t)
  const result = await rpc(server.localUrl, name, args)
  assert.equal(result.body.result.isError, undefined, JSON.stringify(result.body))
  assert.equal(calls.length, 1)
  assert.equal(calls[0].args.request[Object.keys(args)[1]], -1)
})
test('native validation errors retain their code and details instead of a bridge range rejection', async t => {
  const { server, ctx } = await fixture(t)
  ctx.typertGateway.invoke = async () => { throw Object.assign(new Error('Native cursor error'), { code: 'gateway/bad-request', details: { field: 'afterSeq' } }) }
  const result = await rpc(server.localUrl, 'dsh_session_wait', { sessionId: 'native-session', afterSeq: -2 })
  assert.equal(result.body.result.structuredContent.error.code, 'gateway/bad-request')
  assert.deepEqual(result.body.result.structuredContent.error.details, { field: 'afterSeq' })
})
test('session prompt forwards native extension fields and combines text with content blocks', async t => {
  const { server, calls } = await fixture(t)
  const args = { sessionId: 'native-session', text: 'Read this', content: [{ type: 'text', text: 'second block' }], nativeExtension: { enabled: true } }
  const result = await rpc(server.localUrl, 'dsh_session_prompt', args)
  assert.equal(result.body.result.isError, undefined, JSON.stringify(result.body))
  assert.deepEqual(calls[0].args.request.content, [{ type: 'text', text: 'Read this' }, { type: 'text', text: 'second block' }])
  assert.deepEqual(calls[0].args.request.nativeExtension, args.nativeExtension)
  assert.equal('text' in calls[0].args.request, false)
})
test('all native session wrappers forward fields without a plugin-owned field allowlist', async t => {
  const { server, calls } = await fixture(t)
  for (const name of ['dsh_sessions', 'dsh_session_create', 'dsh_session_state', 'dsh_session_wait', 'dsh_session_events', 'dsh_session_cancel', 'dsh_session_model']) {
    const args = { sessionId: 'native-session', provider: 'native', model: 'native', nativeExtension: { sample: name } }
    const result = await rpc(server.localUrl, name, args)
    assert.equal(result.body.result.isError, undefined, `${name}: ${JSON.stringify(result.body)}`)
    const request = Object.values(calls.at(-1).args)[0]
    assert.deepEqual(request.nativeExtension, args.nativeExtension)
  }
})
for (const size of [4194305, 5 * 1024 * 1024, 16 * 1024 * 1024]) {
  test(`HTTP transport forwards a ${size}-byte JSON request`, async t => {
    let received = 0
    const adapter = { tools: [{ name: 'bytes', description: 'Measure received bytes', inputSchema: { type: 'object', properties: { text: { type: 'string' } } }, run(a) { received = Buffer.byteLength(a.text); return { received } } }] }
    const server = await startMcpServer({ adapter, token: 'large-payload' });t.after(() => server.close())
    const body = message('bytes', { text: '' });body.params.arguments.text = 'x'.repeat(size - Buffer.byteLength(JSON.stringify(body)))
    const response = await fetch(server.localUrl, { method: 'POST', headers, body: JSON.stringify(body) })
    assert.equal(response.status, 200, await response.clone().text())
    assert.equal(unpack(await response.text()).result.structuredContent.received, received)
    assert.equal(received, body.params.arguments.text.length)
  })
}
test('web-standard handler also accepts a large body without the Node adapter', async t => {
  const handler = makeHandler({ tools: [{ name: 'bytes', inputSchema: { type: 'object', properties: { text: { type: 'string' } } }, run: a => ({ size: a.text.length }) }] })
  t.after(() => handler.close())
  const response = await handler.fetch(new Request('http://localhost/mcp', { method: 'POST', headers, body: JSON.stringify(message('bytes', { text: 'x'.repeat(5 * 1024 * 1024) })) }))
  assert.equal(response.status, 200)
  assert.equal(unpack(await response.text()).result.structuredContent.size, 5 * 1024 * 1024)
})
for (const count of [101, 256]) test(`legacy batch dispatch preserves all ${count} messages`, async t => {
  const { server } = await fixture(t)
  const batch = Array.from({ length: count }, () => ({ jsonrpc: '2.0', id: ++serial, method: 'ping' }))
  const response = await fetch(server.localUrl, { method: 'POST', headers, body: JSON.stringify(batch) })
  assert.equal(response.status, 200, await response.clone().text())
  const text = await response.text()
  const responses = text.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)))
  assert.equal(responses.flat().length, count)
  assert.deepEqual(new Set(responses.flat().map(item => item.id)), new Set(batch.map(item => item.id)))
})
for (const operation of ['disable', 'suspend', 'dispose']) test(`a pending diagnostic cannot block ${operation}`, async t => {
  const { control } = await controller(t)
  await control.configure({ enabled: true })
  const realFetch = globalThis.fetch
  let entered, release, observedSignal
  const started = new Promise(resolve => { entered = resolve })
  globalThis.fetch = (_url, options) => new Promise(resolve => { observedSignal = options.signal; release = () => resolve(new Response(JSON.stringify({ result: { tools: [] } }))); entered() })
  let checking, stopping, stopped = false
  try {
    checking = control.check();await started
    stopping = (operation === 'disable' ? control.configure({ enabled: false }) : control[operation]()).then(() => { stopped = true })
    await new Promise(resolve => setTimeout(resolve, 80))
    assert.equal(stopped, true)
    assert.equal(control.status().running, false)
    assert.equal(observedSignal?.aborted, true)
  } finally { release();await checking.catch(() => {});await stopping;globalThis.fetch = realFetch }
  assert.equal(control.status().lastCheck, null, 'An old diagnostic must not replace the new state')
})
test('diagnostic failure does not replace healthy service status', async t => {
  const { control } = await controller(t)
  await control.configure({ enabled: true })
  const realFetch = globalThis.fetch;globalThis.fetch = async () => { throw new Error('Diagnostic network error') }
  try { await assert.rejects(control.check(), /Diagnostic network error/) } finally { globalThis.fetch = realFetch }
  assert.equal(control.status().running, true)
  assert.equal(control.status().error, '')
  assert.equal(control.status().lastCheck.ok, false)
})
test('MCP can start while the native API registry is still loading', async t => {
  const { control, ctx } = await controller(t)
  const gateway = ctx.typertGateway;delete ctx.typertGateway
  const status = await control.configure({ enabled: true })
  assert.equal(status.running, true)
  assert.equal((await rpc(status.localUrl, 'dsh_status', {})).body.result.isError, undefined)
  ctx.typertGateway = gateway
  assert.equal((await rpc(status.localUrl, 'dsh_sessions', {})).body.result.isError, undefined)
})
test('stored connection keys are not silently replaced based on generator length', async t => {
  const { control, configPath } = await controller(t)
  await writeFile(configPath, JSON.stringify({ enabled: false, token: 'a-valid-existing-connection-key' }))
  await control.initialize();const status = await control.configure({ enabled: true })
  assert.equal(new URL(status.localUrl).pathname, '/mcp/a-valid-existing-connection-key')
})
test('HTTPS forwarding supports a deployment path prefix', async t => {
  assert.equal(validatePreferences({ publicOrigin: 'https://example.test/dsh/' }).publicOrigin, 'https://example.test/dsh')
  const { control } = await controller(t)
  const status = await control.configure({ enabled: true, publicOrigin: 'https://example.test/dsh/' })
  assert.equal(status.publicUrl, 'https://example.test/dsh' + new URL(status.localUrl).pathname)
  const forwarded = new URL(status.localUrl);forwarded.pathname = '/dsh' + forwarded.pathname
  assert.equal((await rpc(forwarded.href, 'dsh_status', {})).body.result.isError, undefined)
})
test('tool annotations distinguish creation and inspection from unrestricted execution', () => {
  const { ctx } = environment();const adapter = createDshAdapter(ctx, {})
  const tool = name => adapter.tools.find(tool => tool.name === name)
  assert.equal(tool('dsh_session_create').annotations.destructiveHint, false)
  assert.equal(tool('dsh_tools').annotations.destructiveHint, false)
  assert.equal(tool('dsh_tools').annotations.readOnlyHint, false)
  assert.equal(tool('dsh_session_model').annotations.openWorldHint, false)
  assert.equal(tool('dsh_api_call').annotations.destructiveHint, true)
  assert.equal(tool('dsh_tool_call').annotations.openWorldHint, true)
})

test('modern HTTP preserves payloads larger than the SDK default', async t => {
  const handler = makeHandler({ tools: [{ name: 'bytes', inputSchema: { type: 'object', properties: { text: { type: 'string' } } }, run: a => ({ size: a.text.length }) }] })
  t.after(() => handler.close())
  const body = message('bytes', { text: 'x'.repeat(5 * 1024 * 1024) })
  body.params._meta = { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'bridge-regression', version: '1' } }
  const response = await handler.fetch(new Request('http://localhost/mcp', { method: 'POST', headers: { ...headers, 'MCP-Protocol-Version': '2026-07-28', 'Mcp-Method': 'tools/call', 'Mcp-Name': 'bytes' }, body: JSON.stringify(body) }))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).result.structuredContent.size, 5 * 1024 * 1024)
})
test('modern subscriptions are not capped at the SDK default of 1024', async () => {
  const handler = makeHandler({ tools: [] }), readers = []
  try {
    for (let i = 0; i < 1025; i++) {
      const body = { jsonrpc: '2.0', id: ++serial, method: 'subscriptions/listen', params: { notifications: {}, _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'bridge-regression', version: '1' } } } }
      const response = await handler.fetch(new Request('http://localhost/mcp', { method: 'POST', headers: { ...headers, 'MCP-Protocol-Version': '2026-07-28', 'Mcp-Method': 'subscriptions/listen' }, body: JSON.stringify(body) }))
      assert.equal(response.status, 200)
      const reader = response.body.getReader();readers.push(reader)
      const frame = new TextDecoder().decode((await reader.read()).value)
      assert.match(frame, /subscriptions\/acknowledged/, `Subscription ${i + 1}: ${frame}`)
    }
  } finally {
    await handler.close()
    await Promise.all(readers.map(reader => reader.cancel()))
  }
})
test('large native results are returned without bridge truncation', async t => {
  const text = 'result'.repeat(900000)
  const server = await startMcpServer({ token: 'large-result', adapter: { tools: [{ name: 'result', inputSchema: { type: 'object' }, run: () => ({ text }) }] } })
  t.after(() => server.close())
  const result = await rpc(server.localUrl, 'result', {})
  assert.equal(result.body.result.structuredContent.text, text)
})
test('unknown native delivery modes reach host validation instead of a frozen adapter enum', async t => {
  const { server, calls } = await fixture(t)
  const result = await rpc(server.localUrl, 'dsh_session_prompt', { sessionId: 'native-session', text: 'message', mode: 'host-extension' })
  assert.equal(result.body.result.isError, undefined)
  assert.equal(calls[0].args.request.mode, 'host-extension')
})
