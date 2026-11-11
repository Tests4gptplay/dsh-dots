import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNotificationController, signWebhook, registerNotificationTransport } from '../lib/notify-control.mjs'
import { startMcpServer } from '../lib/mcp-server.mjs'
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

function fakeDsh() {
  const listeners = new Map(), delivered = [], requests = []
  const ctx = { on(name, callback) { listeners.set(name, callback); return () => listeners.delete(name) } }
  const secret = 'whsec_' + randomBytes(32).toString('base64')
  const webhookPost = async (url, req) => {
    assert.equal(url, 'https://chatgpt.example.test/events')
    assert.equal(req.headers['webhook-signature'], signWebhook(req.body, req.headers['webhook-id'], req.headers['webhook-timestamp'], secret))
    const body = JSON.parse(req.body)
    requests.push(body)
    if (body.type === 'verification') return { status: 200, body: JSON.stringify({ challenge: body.challenge }) }
    delivered.push(body)
    return { status: 202, body: '' }
  }
  return { ctx, listeners, delivered, requests, secret, webhookPost }
}
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'dots-events-'))
  const fake = fakeDsh()
  const controller = createNotificationController(fake.ctx, { dataDir: dir, webhookPost: fake.webhookPost })
  t.after(async () => { await controller.dispose(); await rm(dir, { recursive: true, force: true }) })
  await controller.initialize()
  return { ...fake, dir, controller }
}
const args = (fake, sessionId = 's1') => ({ name: 'dsh.session.turn-ended', arguments: { sessionId },
  delivery: { mode: 'webhook', url: 'https://chatgpt.example.test/events', secret: fake.secret } })

test('notifications are initially disabled and always require an exact opted-in session and type', async t => {
  const f = await fixture(t)
  assert.equal(f.controller.status().enabled, false)
  assert.deepEqual((await f.controller.list()).events, [])
  assert.equal(f.listeners.size, 0)
  await f.controller.configure({ enabled: true })
  assert.deepEqual((await f.controller.list()).events, [])
  await f.controller.configure({ sessions: ['s1'], types: ['dsh.session.turn-ended'] })
  assert.equal((await f.controller.list()).events.length, 1)
  await assert.rejects(f.controller.subscribe(args(f, 'other-session')), /Choose this exact/)
  const record = await f.controller.subscribe(args(f))
  assert.match(record.id, /^sub_[a-f0-9]+$/)
  assert.equal(f.controller.status().subscriptionCount, 1)
  const onEvent = f.listeners.get('session/event')
  assert.ok(onEvent)
  onEvent({ id: 's2' }, { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' }, text: 'PRIVATE' } })
  onEvent({ id: 's1' }, { type: 'user/message', data: { content: 'PRIVATE' } })
  onEvent({ id: 's1' }, { type: 'turn/end', data: { turn: 2, reason: { kind: 'completed' }, text: 'PRIVATE' } })
  await new Promise(resolve => setTimeout(resolve, 35))
  assert.equal(f.delivered.length, 1)
  assert.deepEqual(f.delivered[0].data, { sessionId: 's1', turn: 2, reason: 'completed' })
  assert.equal(JSON.stringify(f.delivered).includes('PRIVATE'), false)
  const repeated = await f.controller.subscribe(args(f))
  assert.equal(record.id, repeated.id)
  assert.equal(f.controller.status().subscriptionCount, 1)
  await f.controller.configure({ enabled: false })
  assert.equal(f.controller.status().enabled, false)
  assert.equal(f.controller.status().subscriptionCount, 0)
  assert.equal(f.listeners.size, 0)
  await f.controller.configure({ enabled: true })
  assert.equal(f.controller.status().subscriptionCount, 0, 'reenabling cannot silently resurrect a revoked subscription')
  const saved = JSON.parse(await readFile(join(f.dir, 'notifications.json'), 'utf8'))
  assert.equal(saved.subscriptions.length, 0)
})
test('unsubscribe is idempotent, scopes can be narrowed, and saved scope survives restart', async t => {
  const f = await fixture(t)
  await f.controller.configure({ enabled: true, sessions: ['s1', 's2'], types: ['dsh.session.turn-ended'] })
  const active = await f.controller.subscribe(args(f))
  assert.equal(f.controller.status().subscriptionCount, 1)
  await f.controller.unsubscribe({ name: 'dsh.session.turn-ended', arguments: { sessionId: 's1' },
    delivery: { mode: 'webhook', url: 'https://chatgpt.example.test/events' } })
  assert.equal(f.controller.status().subscriptionCount, 0)
  await f.controller.unsubscribe({ name: 'dsh.session.turn-ended', arguments: { sessionId: 's1' },
    delivery: { mode: 'webhook', url: 'https://chatgpt.example.test/events' } })
  const next = await f.controller.subscribe(args(f))
  assert.equal(next.id, active.id)
  await f.controller.configure({ sessions: ['s2'] })
  assert.equal(f.controller.status().subscriptionCount, 0)
  const reloaded = createNotificationController(f.ctx, { dataDir: f.dir, webhookPost: f.webhookPost })
  try {
    await reloaded.initialize()
    assert.deepEqual(reloaded.status().sessions, ['s2'])
    assert.equal(reloaded.status().subscriptionCount, 0)
  } finally { await reloaded.dispose() }
})
test('MCP Events methods use the existing authenticated HTTP endpoint', async t => {
  const f = await fixture(t)
  const server = await startMcpServer({ token: 'notify-test', adapter: { tools: [] }, events: f.controller })
  t.after(() => server.close())
  const officialClient = new Client({ name: 'events-capability-regression', version: '1.0' })
  await officialClient.connect(new StreamableHTTPClientTransport(new URL(server.localUrl)))
  try {
    assert.ok(Object.hasOwn(officialClient.getServerCapabilities() ?? {}, 'events'),
      'Server must advertise events in official MCP initialization capabilities')
  } finally { await officialClient.close() }
  const rpc = async (method, params = {}) => {
    const response = await fetch(server.localUrl, { method: 'POST', headers: {
      'content-type': 'application/json', accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-11-25' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    })
    const text = await response.text()
    const frame = text.startsWith('{') ? JSON.parse(text) :
      JSON.parse(text.split('\n').find(line => line.startsWith('data: ')).slice(6))
    return { status: response.status, frame }
  }
  assert.deepEqual((await rpc('events/list')).frame.result.events, [])
  await f.controller.configure({ enabled: true, sessions: ['s1'], types: ['dsh.session.turn-ended'] })
  const listed = await rpc('events/list')
  assert.equal(listed.status, 200)
  assert.equal(listed.frame.result.events[0].name, 'dsh.session.turn-ended')
  const modern = {
    jsonrpc: '2.0', id: 'modern-notify', method: 'events/list',
    params: { _meta: {
      'io.modelcontextprotocol/protocolVersion': '2026-07-28',
      'io.modelcontextprotocol/clientCapabilities': {},
      'io.modelcontextprotocol/clientInfo': { name: 'dots-events-verification', version: '1' },
    } },
  }
  const discover = { ...modern, id: 'discover-notify', method: 'server/discover' }
  const discovered = await fetch(server.localUrl, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json',
      'MCP-Protocol-Version': '2026-07-28', 'Mcp-Method': 'server/discover' }, body: JSON.stringify(discover),
  })
  assert.equal(discovered.status, 200, await discovered.clone().text())
  const caps = (await discovered.json()).result?.capabilities
  assert.ok(caps && Object.hasOwn(caps, 'events'), 'Modern server/discover must advertise MCP Events')
  const modernResponse = await fetch(server.localUrl, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json',
      'MCP-Protocol-Version': '2026-07-28', 'Mcp-Method': 'events/list' }, body: JSON.stringify(modern),
  })
  assert.equal(modernResponse.status, 200, await modernResponse.clone().text())
  const modernPayload = await modernResponse.json()
  assert.equal(modernPayload.result.events[0].name, 'dsh.session.turn-ended', JSON.stringify(modernPayload))
  const subscribed = await rpc('events/subscribe', args(f))
  assert.equal(subscribed.frame.result.id.startsWith('sub_'), true, JSON.stringify(subscribed))
  assert.equal(f.controller.status().subscriptionCount, 1)
  const unsubscribed = await rpc('events/unsubscribe', { name: 'dsh.session.turn-ended', arguments: { sessionId: 's1' },
    delivery: { mode: 'webhook', url: 'https://chatgpt.example.test/events' } })
  assert.deepEqual(unsubscribed.frame.result, {})
  assert.equal(f.controller.status().subscriptionCount, 0)
})
test('notification settings RPC is only registered on DSH authenticated settings', async t => {
  const f = await fixture(t)
  const routes = []
  const undo = registerNotificationTransport({ fetch: { register(route) { routes.push(route); return () => {} } } }, f.controller)
  const route = routes.find(route => route.path.endsWith('/configure'))
  assert.equal(route.path, '/api/dsh-dots-notify/configure')
  const method = 'dsh-dots-notify/configure'
  const response = await route.fetch(new Request('http://localhost' + route.path, { method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', method, rpcId: 'one', payload: { enabled: true, sessions: ['s1'], types: ['dsh.session.error'] } }),
  }))
  assert.equal((await response.json()).result.ok, true)
  assert.deepEqual(f.controller.status().types, ['dsh.session.error'])
  await undo()
})
