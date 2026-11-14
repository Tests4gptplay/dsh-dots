/** Optional user-selected DSH events sent through the official MCP Events webhook protocol. */
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { readFile, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { request as httpsRequest } from 'node:https'
import { BlockList, isIP } from 'node:net'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

export const NOTIFY_EVENTS = Object.freeze({
  'dsh.session.turn-ended': {
    description: 'A turn ended in a session explicitly selected in Dots notification settings.',
    payloadSchema: { type: 'object', properties: { sessionId: { type: 'string' }, turn: { type: 'integer' }, reason: { type: 'string' } }, required: ['sessionId', 'turn', 'reason'], additionalProperties: false },
  },
  'dsh.session.error': {
    description: 'DSH reported an agent error for a session explicitly selected in Dots notification settings.',
    payloadSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'], additionalProperties: false },
  },
})
const defaults = () => ({ enabled: false, sessions: [], types: [], subscriptions: [] })
const blocked = new BlockList()
for (const [ip, bits] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
]) blocked.addSubnet(ip, bits, 'ipv4')
for (const [ip, bits] of [
  ['::', 128], ['::1', 128], ['100::', 64], ['2001:db8::', 32], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
]) blocked.addSubnet(ip, bits, 'ipv6')
function publicAddress(ip) {
  const address = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  const family = isIP(address)
  return family !== 0 && !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6')
}
function callbackUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('MCP Events callback must be HTTPS without credentials or fragment.')
  return url.toString()
}
/** Validate at the connection and pin the public address while preserving hostname TLS verification. */
export async function postPublicWebhook(url, { body, headers, signal }) {
  const destination = new URL(callbackUrl(url))
  const addresses = await lookup(destination.hostname, { all: true })
  if (!addresses.length || addresses.some(address => !publicAddress(address.address))) {
    throw new Error('MCP Events callback resolves to a private or non-public address.')
  }
  const address = addresses[0]
  return new Promise((resolve, reject) => {
    const request = httpsRequest(destination, {
      method: 'POST', headers, signal, servername: destination.hostname,
      lookup: (_hostname, options, callback) => {
        if (options?.all) callback(null, [address])
        else callback(null, address.address, address.family)
      },
    }, response => {
      let text = ''
      response.on('data', chunk => { if (text.length < 65536) text += chunk.toString() })
      response.once('end', () => resolve({ status: response.statusCode, body: text }))
      response.once('error', reject)
    })
    request.once('error', reject)
    request.end(body)
  })
}
function secretBytes(secret) {
  if (typeof secret !== 'string' || !/^whsec_[A-Za-z0-9+/_-]+={0,2}$/.test(secret)) throw new Error('MCP Events signing secret is invalid.')
  const decoded = Buffer.from(secret.slice(6).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  if (decoded.length < 24 || decoded.length > 64) throw new Error('MCP Events signing secret must decode to 24–64 bytes.')
  return decoded
}
export function signWebhook(body, id, timestamp, secret) {
  return 'v1,' + createHmac('sha256', secretBytes(secret)).update(id + '.' + timestamp + '.' + body).digest('base64')
}
async function sendSigned(subscription, data, post, signal) {
  const body = JSON.stringify(data)
  if (Buffer.byteLength(body, 'utf8') > 262144) throw new Error('Official MCP Events payload limit is 256 KiB.')
  const id = data.eventId || 'msg_verification_' + randomUUID()
  const timestamp = String(Math.floor(Date.now() / 1000))
  return post(subscription.url, {
    body, signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    headers: { 'Content-Type': 'application/json', 'webhook-id': id, 'webhook-timestamp': timestamp,
      'webhook-signature': signWebhook(body, id, timestamp, subscription.secret), 'X-MCP-Subscription-Id': subscription.id },
  })
}
function selectedStrings(values) {
  if (!Array.isArray(values) || values.some(value => typeof value !== 'string')) throw new TypeError('Notification selections must be string arrays.')
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
}
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}'
  return JSON.stringify(value)
}
export function createNotificationController(ctx, { dataDir, canDeliver = () => true, webhookPost = postPublicWebhook } = {}) {
  const file = join(dataDir, 'notifications.json')
  let prefs = defaults(), loaded, disposed = false, detach = [], epoch = 0
  let error = '', lastDelivery = null, writer = Promise.resolve()
  let lifetime = new AbortController()
  const pending = new Set()
  const store = action => {
    const transaction = writer.then(action)
    writer = transaction.catch(() => {})
    return transaction
  }
  const save = async value => {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 })
    const temp = file + '.' + randomUUID() + '.tmp'
    try {
      await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
      await rename(temp, file)
    } finally { await rm(temp, { force: true }) }
  }
  const load = () => loaded ??= (async () => {
    try {
      const value = JSON.parse(await readFile(file, 'utf8'))
      prefs = { enabled: value.enabled === true, sessions: selectedStrings(value.sessions || []),
        types: selectedStrings(value.types || []).filter(type => Object.hasOwn(NOTIFY_EVENTS, type)),
        subscriptions: Array.isArray(value.subscriptions) ? value.subscriptions : [] }
    } catch (cause) { if (cause.code !== 'ENOENT') throw cause }
    reconcile()
  })()
  const inScope = (name, sessionId) => prefs.enabled && prefs.types.includes(name) && prefs.sessions.includes(sessionId)
  function stopListening() {
    for (const off of detach.splice(0)) if (typeof off === 'function') off()
    lifetime.abort()
    lifetime = new AbortController()
  }
  function publish(name, sessionId, data) {
    if (disposed || !inScope(name, sessionId) || !canDeliver()) return
    const subscriptions = prefs.subscriptions.filter(sub => sub.name === name && sub.sessionId === sessionId && sub.expiresAt > Date.now())
    for (const subscription of subscriptions) {
      const currentEpoch = epoch
      const event = { eventId: 'evt_' + randomUUID(), name, timestamp: new Date().toISOString(), data, cursor: null }
      const task = (async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          if (lifetime.signal.aborted || epoch !== currentEpoch || !inScope(name, sessionId) || !canDeliver()) return
          try {
            const result = await sendSigned(subscription, event, webhookPost, lifetime.signal)
            if (result.status >= 200 && result.status < 300) {
              lastDelivery = { at: new Date().toISOString(), name, sessionId, ok: true, status: result.status }
              return
            }
            if ([410, 413].includes(result.status) || (result.status < 500 && result.status !== 408 && result.status !== 429)) {
              lastDelivery = { at: new Date().toISOString(), name, sessionId, ok: false, status: result.status }
              return
            }
          } catch (cause) {
            if (lifetime.signal.aborted) return
            error = String(cause.message || cause)
          }
          if (attempt < 2) try { await delay(250 * (2 ** attempt), undefined, { signal: lifetime.signal }) } catch { return }
        }
        lastDelivery = { at: new Date().toISOString(), name, sessionId, ok: false }
      })()
      pending.add(task)
      void task.finally(() => pending.delete(task))
    }
  }
  function reconcile() {
    stopListening()
    if (disposed || !prefs.enabled || !ctx.on || !prefs.sessions.length || !prefs.types.length) return
    detach.push(ctx.on('session/event', (session, event) => {
      if (event.type !== 'turn/end') return
      const sessionId = String(session?.header?.id ?? session?.id ?? '')
      publish('dsh.session.turn-ended', sessionId, { sessionId, turn: event.data.turn, reason: String(event.data.reason?.kind || 'unknown') })
    }, { global: true }))
    detach.push(ctx.on('agent/error', ({ agent }) => {
      const sessionId = String(agent?.session?.id ?? agent?.session?.header?.id ?? '')
      publish('dsh.session.error', sessionId, { sessionId })
    }, { global: true }))
  }
  function status() {
    return { enabled: prefs.enabled, sessions: [...prefs.sessions], types: [...prefs.types],
      active: prefs.enabled && prefs.sessions.length > 0 && prefs.types.length > 0 && Boolean(ctx.on) && canDeliver(),
      subscriptionCount: prefs.subscriptions.filter(sub => sub.expiresAt > Date.now()).length,
      lastDelivery, error, events: Object.keys(NOTIFY_EVENTS) }
  }
  function definitions() {
    if (!prefs.enabled || !prefs.sessions.length) return { events: [] }
    return { events: prefs.types.map(name => ({ name, description: NOTIFY_EVENTS[name].description, delivery: ['webhook'],
      inputSchema: { type: 'object', properties: { sessionId: { type: 'string', description: 'Exact session ID selected in Dots notification settings.' } }, required: ['sessionId'], additionalProperties: false },
      payloadSchema: NOTIFY_EVENTS[name].payloadSchema })) }
  }
  function validateSubscription(params) {
    const name = params?.name, args = params?.arguments
    const sessionId = args?.sessionId
    if (!Object.hasOwn(NOTIFY_EVENTS, name) || !args || Object.keys(args).length !== 1 || typeof sessionId !== 'string' || !inScope(name, sessionId)) {
      throw new Error('Choose this exact DSH session and event type in Dots notification settings first.')
    }
    if (params.delivery?.mode !== 'webhook') throw new Error('MCP Events requires webhook delivery.')
    return { name, sessionId, url: callbackUrl(params.delivery.url) }
  }
  return {
    status, initialize: load,
    list: async () => { await load(); return definitions() },
    revokeConnection: async () => {
      await load()
      return store(async () => {
        epoch++
        stopListening()
        const next = { ...prefs, subscriptions: [] }
        await save(next)
        prefs = next
        reconcile()
        return status()
      })
    },
    configure: async patch => {
      await load()
      return store(async () => {
        const next = { ...prefs }
        if (patch.enabled !== undefined) {
          if (typeof patch.enabled !== 'boolean') throw new TypeError('Notification enabled must be boolean.')
          next.enabled = patch.enabled
        }
        if (patch.sessions !== undefined) next.sessions = selectedStrings(patch.sessions)
        if (patch.types !== undefined) next.types = selectedStrings(patch.types).filter(type => Object.hasOwn(NOTIFY_EVENTS, type))
        next.subscriptions = next.enabled ? next.subscriptions.filter(sub => next.sessions.includes(sub.sessionId) && next.types.includes(sub.name)) : []
        epoch++
        stopListening()
        prefs = next
        try { await save(next) } catch (cause) { error = String(cause.message || cause); throw cause }
        error = ''
        reconcile()
        return status()
      })
    },
    subscribe: async params => {
      await load()
      const { name, sessionId, url } = validateSubscription(params)
      const secret = params.delivery?.secret
      secretBytes(secret)
      const identity = canonical({ principal: 'dsh-owner', name, arguments: { sessionId }, url })
      const id = 'sub_' + createHash('sha256').update(identity).digest('hex').slice(0, 32)
      const age = params.ttlMs == null ? 86400000 : params.ttlMs
      if (!Number.isFinite(age) || age <= 0) throw new Error('MCP Events ttlMs must be positive.')
      const expiresAt = Date.now() + Math.min(age, 86400000)
      const currentEpoch = epoch
      const existing = prefs.subscriptions.find(sub => sub.id === id)
      if (!existing || existing.secret !== secret || existing.expiresAt < Date.now()) {
        const challenge = randomUUID()
        const provisional = { id, name, sessionId, url, secret, expiresAt }
        const verified = await sendSigned(provisional, { type: 'verification', challenge }, webhookPost, lifetime.signal)
        let echoed
        try { echoed = JSON.parse(verified.body).challenge } catch {}
        const expected = Buffer.from(challenge), actual = Buffer.from(String(echoed || ''))
        if (!(verified.status >= 200 && verified.status < 300 && expected.length === actual.length && timingSafeEqual(expected, actual))) {
          const failure = new Error('MCP Events callback verification failed.')
          failure.code = -32015
          failure.data = { reason: 'challenge_failed' }
          throw failure
        }
      }
      return store(async () => {
        if (epoch !== currentEpoch || !inScope(name, sessionId)) throw new Error('Notification scope changed during callback verification.')
        const next = { ...prefs, subscriptions: [...prefs.subscriptions.filter(sub => sub.id !== id), { id, name, sessionId, url, secret, expiresAt }] }
        await save(next)
        prefs = next
        return { id, refreshBefore: new Date(expiresAt).toISOString(), cursor: null, truncated: false }
      })
    },
    unsubscribe: async params => {
      await load()
      return store(async () => {
        const name = params?.name, url = callbackUrl(params?.delivery?.url)
        const sessionId = params?.arguments?.sessionId
        const next = { ...prefs, subscriptions: prefs.subscriptions.filter(sub => !(sub.name === name && sub.sessionId === sessionId && sub.url === url)) }
        await save(next)
        prefs = next
        return {}
      })
    },
    async dispose() {
      disposed = true
      epoch++
      stopListening()
      await Promise.allSettled([...pending])
    },
  }
}
/** Settings RPC remains on the DSH authenticated transport, separate from the public MCP endpoint. */
export function registerNotificationTransport(connection, controller) {
  const disposers = ['status', 'configure'].map(endpoint => {
    const method = 'dsh-dot-mcp-notify/' + endpoint
    return connection.fetch.register({ path: '/api/' + method, methods: ['POST'], requestBody: 'buffered',
      async fetch(request) {
        if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return new Response('Expected JSON', { status: 415 })
        let body
        try { body = await request.json() } catch { return new Response('Invalid JSON', { status: 400 }) }
        if (body?.type !== 'client-request' || body.method !== method || typeof body.rpcId !== 'string' || !body.rpcId) return new Response('Invalid DSH request', { status: 400 })
        try {
          await controller.initialize()
          const value = await controller[endpoint](body.payload || {})
          return Response.json({ type: 'server-response', rpcId: body.rpcId, result: { ok: true, value } })
        } catch (cause) {
          return Response.json({ type: 'server-response', rpcId: body.rpcId, result: { ok: false,
            error: { code: 'dsh_dots_notify', message: String(cause.message || cause), details: { issues: [] } } } })
        }
      } })
  })
  return async () => { for (const dispose of disposers.reverse()) await dispose() }
}