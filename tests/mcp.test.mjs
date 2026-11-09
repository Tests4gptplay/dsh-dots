import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { startMcpServer, resultOf } from '../lib/mcp-server.mjs'
import { createMcpController, registerMcpTransport, validatePreferences } from '../lib/mcp-control.mjs'
import { createDshAdapter } from '../lib/mcp-adapter.mjs'

const schema = { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false }
const echo = { name: 'echo', description: 'Echo the supplied text', inputSchema: schema, annotations: { readOnlyHint: true }, run: async args => args }
async function server(t, options = {}) {
 const value = await startMcpServer({ adapter: { tools: [echo] }, token: 'test-key', ...options })
 t.after(() => value.close())
 return value
}
async function client(t, url, options = {}) {
 const value = new Client({ name: 'dots-protocol-tests', version: '2.0.0' }, options)
 t.after(() => value.close())
 await value.connect(new StreamableHTTPClientTransport(new URL(url)))
 return value
}
function context() {
 const calls = [], peers = []
 const ctx = {
  typert: { local: { list: () => [
   { namespace: 'session', method: 'list', parameters: [{ wire: '_request', source: 'json', codec: { jsonSchema: { type: 'object' } } }] },
   { namespace: 'sample', method: 'lookup', parameters: [{ wire: 'agentId', source: 'json', codec: { jsonSchema: { type: 'string' } } }], result: { jsonSchema: { type: 'object' } } },
  ] } },
  typertGateway: { async invoke(request) { calls.push(request); return { accepted: true } } },
  connection: { createPeer(options) { const peer = { ...options, disposed: false, async dispose() { peer.disposed = true } };peers.push(peer);return peer } },
 }
 return { ctx, calls, peers }
}
async function controller(t, options = {}) {
 const dir = await mkdtemp(join(tmpdir(), 'dots-mcp-'))
 t.after(() => rm(dir, { recursive: true, force: true }))
 const env = context()
 const control = createMcpController(env.ctx, { configPath: join(dir, 'mcp.json'), ...options })
 t.after(() => control.dispose())
 return { control, dir, ...env }
}

test('official MCP client discovers and calls the actual HTTP server', async t => {
 const calls = [];const s = await server(t, { onCall: c => calls.push(c) })
 const c = await client(t, s.localUrl)
 assert.equal((await c.listTools()).tools[0].name, 'echo')
 const result = await c.callTool({ name: 'echo', arguments: { text: '中文 test' } })
 assert.deepEqual(result.structuredContent, { text: '中文 test' })
 assert.equal(calls[0].ok, true)
})
test('SDK validates arguments and preserves concrete tool errors', async t => {
 const s = await server(t, { adapter: { tools: [echo, { ...echo, name: 'failure', run() { throw new Error('native operation failed') } }] } })
 const c = await client(t, s.localUrl)
 const invalid = await c.callTool({ name: 'echo', arguments: { text: 5 } })
 assert.equal(invalid.isError, true)
 const failure = await c.callTool({ name: 'failure', arguments: { text: 'x' } })
 assert.equal(failure.isError, true)
 assert.match(failure.content[0].text, /native operation failed/)
})
test('wrong connection keys cannot discover or execute tools', async t => {
 const s = await server(t)
 const r = await fetch(s.localUrl.replace('test-key', 'wrong-key'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
 assert.equal(r.status, 404)
})
test('native MCP supports legacy stateless tools/list without plugin handshakes', async t => {
 const s = await server(t)
 const r = await fetch(s.localUrl, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }) })
 assert.equal(r.status, 200)
 assert.match(await r.text(), /echo/)
})
test('HTTP lifetime closes its socket and permits reusing the same port', async t => {
 const s = await server(t), port = s.port
 await s.close(); await s.close()
 await assert.rejects(fetch(s.localUrl))
 const next = await server(t, { port })
 assert.equal(next.port, port)
})
test('MCP defaults off and does not import or start its protocol server', async t => {
 let loaded = false
 const { control, peers } = await controller(t, { loadServer: async () => { loaded = true;throw new Error('must stay unloaded') } })
 const status = await control.initialize()
 assert.equal(status.enabled, false);assert.equal(status.running, false);assert.equal(status.localUrl, '')
 assert.equal(loaded, false);assert.equal(peers.length, 0)
})
test('on/off persists, retains its endpoint, and disposes only the MCP peer', async t => {
 const { control, dir, ctx, peers, calls } = await controller(t)
 const first = await control.configure({ enabled: true })
 assert.equal(first.running, true)
 const saved = JSON.parse(await readFile(join(dir, 'mcp.json'), 'utf8'))
 assert.equal(saved.enabled, true);assert.equal(saved.port, first.port);assert.equal(saved.token.length, 43)
 assert.equal((await control.check()).lastCheck.toolCount, 16)
 await control.configure({ enabled: false });assert.equal(peers[0].disposed, true)
 await assert.rejects(fetch(first.localUrl));assert.equal(calls.length, 0, 'Disabling never calls session/cancel')
 const second = await control.configure({ enabled: true });assert.equal(second.localUrl, first.localUrl)
 await control.dispose()
 const reopened = createMcpController(ctx, { configPath: join(dir, 'mcp.json') });t.after(() => reopened.dispose())
 assert.equal((await reopened.initialize()).localUrl, first.localUrl)
 await reopened.configure({ enabled: false })
})
test('disabled preference survives restarting the plugin', async t => {
 const { control, ctx, dir } = await controller(t)
 await control.configure({ enabled: false });await control.dispose()
 const next = createMcpController(ctx, { configPath: join(dir, 'mcp.json') });t.after(() => next.dispose())
 assert.equal((await next.initialize()).enabled, false)
})
test('connection-key rotation invalidates the old address without touching sessions', async t => {
 const { control, calls } = await controller(t)
 const old = await control.configure({ enabled: true }), next = await control.rotate()
 assert.notEqual(old.localUrl, next.localUrl);assert.equal(old.port, next.port)
 assert.equal((await fetch(old.localUrl)).status, 404)
 assert.equal((await control.check()).lastCheck.ok, true);assert.equal(calls.length, 0)
})
test('HTTPS forwarding origin produces the actual full connection URL', async t => {
 const { control } = await controller(t)
 const s = await control.configure({ enabled: true, publicOrigin: 'https://mcp.example.test/' })
 assert.equal(s.publicUrl, 'https://mcp.example.test' + new URL(s.localUrl).pathname)
 assert.equal((await control.check()).lastCheck.ok, true)
})
test('invalid input is explained without replacing working preferences', async t => {
 const { control } = await controller(t)
 const s = await control.configure({ enabled: true })
 await assert.rejects(control.configure({ port: -1 }), /port/)
 assert.equal(control.status().localUrl, s.localUrl)
 assert.throws(() => validatePreferences({ enabled: 'yes' }), /boolean/)
 assert.throws(() => validatePreferences({ publicOrigin: 'http://example.com/extra' }), /HTTPS/)
})
test('native gateway availability recovers without restarting the MCP listener', async t => {
 const { control, ctx } = await controller(t)
 const gateway = ctx.typertGateway;delete ctx.typertGateway
 const status = await control.configure({ enabled: true })
 assert.equal(status.running, true)
 const c = await client(t, status.localUrl)
 assert.equal((await c.callTool({ name: 'dsh_sessions', arguments: {} })).isError, true)
 ctx.typertGateway = gateway
 assert.notEqual((await c.callTool({ name: 'dsh_sessions', arguments: {} })).isError, true)
 assert.equal(control.status().localUrl, status.localUrl)
})
test('reflection preserves actual DSH wire argument names and schemas', async () => {
 const { ctx, calls } = context(), peer = {};const a = createDshAdapter(ctx, peer)
 const tool = name => a.tools.find(t => t.name === name)
 await tool('dsh_sessions').run({}, new AbortController().signal)
 assert.deepEqual(calls[0].args, { _request: {} });assert.equal(calls[0].peer, peer)
 const d = await tool('dsh_api_describe').run({ namespace: 'sample', method: 'lookup' })
 assert.deepEqual(d.inputSchema.required, ['agentId'])
 await tool('dsh_api_call').run({ namespace: 'sample', method: 'lookup', args: { agentId: 'native-id' } })
 assert.deepEqual(calls[1].args, { agentId: 'native-id' })
})
test('prompt accepts text, queues continuation and preserves idempotency request IDs', async () => {
 const { ctx, calls } = context();const a = createDshAdapter(ctx, {})
 const prompt = a.tools.find(t => t.name === 'dsh_session_prompt')
 const out = await prompt.run({ sessionId: 's1', text: 'continue', requestId: 'request-1' })
 assert.equal(out.requestId, 'request-1');assert.equal(calls[0].args.request.mode, 'queue')
 assert.deepEqual(calls[0].args.request.content, [{ type: 'text', text: 'continue' }])
 await prompt.run({ sessionId: 's1' });assert.equal('content' in calls[1].args.request, false, 'Native validation owns missing content')
 await prompt.run({ sessionId: 's1', content: [] });assert.deepEqual(calls[2].args.request.content, [])
})
test('native stream snapshots release only their subscription', async () => {
 const { ctx } = context();let released = false
 ctx.typertGateway.stream = async () => ({ async *[Symbol.asyncIterator]() { try { yield { revision: 3 } } finally { released = true } } })
 const a = createDshAdapter(ctx, {}), tool = a.tools.find(t => t.name === 'dsh_api_snapshot')
 assert.deepEqual(await tool.run({ namespace: 'workspace', method: 'follow', args: {} }), { done: false, value: { revision: 3 } })
 assert.equal(released, true)
})
test('tool errors are reported as MCP errors rather than successful text', () => {
 assert.equal(resultOf({ results: [{ result: { isError: true } }] }).isError, true)
 assert.deepEqual(resultOf([1,2]).structuredContent, { value: [1,2] })
 assert.equal(resultOf({ cursor: 3n }).structuredContent.cursor, '3')
})
test('settings RPC uses native envelopes and validates only transport structure', async () => {
 const routes = [], removed = [];const off = registerMcpTransport({ fetch: { register(route) { routes.push(route);return () => removed.push(route.path) } } }, { status: () => ({ enabled: false }) })
 const route = routes.find(r => r.path.endsWith('/status'))
 const payload = { type: 'client-request', method: 'dsh-dots-mcp/status', rpcId: 'native-rpc', payload: {} }
 const r = await route.fetch(new Request('http://localhost'+route.path,{ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }))
 assert.deepEqual(await r.json(), { type: 'server-response', rpcId: 'native-rpc', result: { ok: true, value: { enabled: false } } })
 assert.equal((await route.fetch(new Request('http://localhost'+route.path,{ method: 'POST',body: '{}' }))).status, 415)
 await off();assert.equal(removed.length, 4)
})

test('modern 2026 MCP client discovers and invokes the same service', async t => {
 const s = await server(t), c = await client(t, s.localUrl, { versionNegotiation: { mode: { pin: '2026-07-28' } } })
 assert.equal((await c.listTools()).tools[0].name, 'echo')
 assert.equal((await c.callTool({ name: 'echo', arguments: { text: 'modern' } })).structuredContent.text, 'modern')
})
test('native image outputs are returned as model-visible MCP image blocks', () => {
 const image = { attachment: { mediaType: 'image/png' }, data: 'aGVsbG8=' }
 assert.deepEqual(resultOf(image).content[1], { type: 'image', data: 'aGVsbG8=', mimeType: 'image/png' })
 const native = { results: [] }
 Object.defineProperty(native, Symbol.for('dsh-dots.mcpContent'), { value: [{ type: 'image', data: 'YWJj', mimeType: 'image/jpeg' }] })
 assert.equal(resultOf(native).content[1].mimeType, 'image/jpeg')
 assert.deepEqual(resultOf(native).structuredContent, { results: [] })
})
