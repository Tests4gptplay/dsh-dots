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
test('tool metadata reports known read-only behavior without invented risk rankings', () => {
  const { ctx } = environment(), adapter = createDshAdapter(ctx, {})
  const tool = name => adapter.tools.find(tool => tool.name === name)
  for (const name of ['dsh_status', 'dsh_sessions', 'dsh_session_state', 'dsh_session_wait', 'dsh_session_events',
    'dsh_model_catalog', 'dsh_api_list', 'dsh_api_describe', 'dsh_tools']) {
    assert.deepEqual(tool(name).annotations, { readOnlyHint: true }, name)
  }
  for (const name of ['dsh_session_prompt', 'dsh_session_create', 'dsh_session_cancel', 'dsh_session_model',
    'dsh_api_call', 'dsh_api_snapshot', 'dsh_api_subscribe', 'dsh_tool_call']) {
    assert.equal(tool(name).annotations, undefined, name)
  }
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

function progressFrames(body) {
  return body.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)))
}
for (const version of ['2025-11-25', '2026-07-28']) {
  test(`native continuous DSH stream forwards every structured event via MCP progress (${version})`, async t => {
    const env = environment(), calls = []
    env.ctx.typertGateway.stream = ({ namespace, method, args, signal }) => {
      calls.push({ namespace, method, args, signal })
      return { async *[Symbol.asyncIterator]() {
        yield { seq: 0, payload: { note: '第一条' } }
        yield { seq: 1, payload: { count: 100000000000000000000n } }
        yield { seq: 2, payload: [1, 2, 3] }
      } }
    }
    const server = await startMcpServer({ adapter: createDshAdapter(env.ctx, {}), token: 'stream-bridge' })
    t.after(() => server.close())
    const modern = version === '2026-07-28'
    const args = { namespace: 'nativeExtension', method: 'customStream', args: { cursor: -1, custom: { enabled: true } } }
    const request = message('dsh_api_subscribe', args)
    request.params._meta = modern ? {
      progressToken: 'native-stream-token', 'io.modelcontextprotocol/protocolVersion': version,
      'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'dots-stream-test', version: '1' },
    } : { progressToken: 'native-stream-token' }
    const response = await fetch(server.localUrl, { method: 'POST', headers: { ...headers,
      'MCP-Protocol-Version': version, ...(modern ? { 'Mcp-Method': 'tools/call', 'Mcp-Name': 'dsh_api_subscribe' } : {}) },
      body: JSON.stringify(request) })
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /text\/event-stream/)
    const frames = progressFrames(await response.text())
    const notices = frames.filter(item => item.method === 'notifications/progress')
    assert.equal(notices.length, 3)
    assert.deepEqual(notices.map(item => item.params.progress), [1, 2, 3])
    assert.ok(notices.every(item => item.params.progressToken === 'native-stream-token'))
    assert.deepEqual(notices.map(item => JSON.parse(item.params.message)), [
      { seq: 0, payload: { note: '第一条' } }, { seq: 1, payload: { count: '100000000000000000000' } },
      { seq: 2, payload: [1, 2, 3] },
    ])
    assert.deepEqual(calls.map(({ namespace, method, args }) => ({ namespace, method, args })), [args])
    assert.equal(frames.at(-1).result.structuredContent.events, 3)
    assert.equal(frames.at(-1).result.structuredContent.completed, true)
  })
}
test('continuous subscription uses the MCP request lifetime to stop the native iterator without cancelling a DSH task', async t => {
  const env = environment()
  let stopNative, closed, abortedSignal
  const closedNative = new Promise(resolve => { stopNative = resolve })
  env.ctx.typertGateway.stream = ({ signal }) => {
    abortedSignal = signal
    return { [Symbol.asyncIterator]() {
      let first = true
      return {
        async next() {
          if (first) { first = false; return { value: { seq: 1, action: 'watch' }, done: false } }
          await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }))
          return { done: true }
        },
        async return() { closed = true; stopNative(); return { done: true } },
      }
    } }
  }
  const server = await startMcpServer({ adapter: createDshAdapter(env.ctx, {}), token: 'stream-abort' })
  t.after(() => server.close())
  const request = message('dsh_api_subscribe', { namespace: 'workspace', method: 'follow', args: {} })
  request.params._meta = { progressToken: 'abort-token' }
  const abort = new AbortController()
  const response = await fetch(server.localUrl, { method: 'POST', headers, body: JSON.stringify(request), signal: abort.signal })
  assert.match(response.headers.get('content-type'), /text\/event-stream/)
  const reader = response.body.getReader()
  const first = new TextDecoder().decode((await reader.read()).value)
  assert.match(first, /notifications\/progress/)
  abort.abort('Stop listening')
  await closedNative
  assert.equal(abortedSignal.aborted, true)
  assert.equal(closed, true)
})
test('subscription without MCP progress support reports its transport requirement immediately', async t => {
  const env = environment()
  let started = false
  env.ctx.typertGateway.stream = () => { started = true; throw new Error('should not start a stream without progress transport') }
  const server = await startMcpServer({ adapter: createDshAdapter(env.ctx, {}), token: 'stream-missing-progress' })
  t.after(() => server.close())
  const result = await rpc(server.localUrl, 'dsh_api_subscribe', { namespace: 'workspace', method: 'follow', args: {} })
  assert.equal(result.body.result.isError, true)
  assert.match(result.body.result.structuredContent.error.message, /progressToken/)
  assert.equal(started, false)
})
