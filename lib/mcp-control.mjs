/** Profile-scoped preferences and on-demand MCP lifetime. No task state is stored here. */
import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { randomBytes, randomUUID } from 'node:crypto'
import { createDshAdapter, getService } from './mcp-adapter.mjs'

export const MCP_GUIDES = Object.freeze({
  registration: 'https://developers.openai.com/plugins/deploy/connect-chatgpt',
  registrationZh: 'https://help.openai.com/zh-hans-cn/articles/12584461-connecting-custom-mcp-servers-in-chatgpt',
  tunnel: 'https://developers.openai.com/api/docs/guides/secure-mcp-tunnels',
  tunnelSettings: 'https://platform.openai.com/settings/organization/tunnels',
  dots: 'https://help.openai.com/en/articles/20001530-getting-started-with-your-dot',
})
const defaults = () => ({ enabled: false, port: 0, publicOrigin: '', token: '' })
export function validatePreferences(value, current = defaults()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('MCP settings must be an object.')
  const result = { ...current }
  if (value.enabled !== undefined) {
    if (typeof value.enabled !== 'boolean') throw new TypeError('enabled must be a boolean.')
    result.enabled = value.enabled
  }
  if (value.port !== undefined) {
    if (!Number.isInteger(value.port) || value.port < 0 || value.port > 65535) throw new TypeError('port must be an integer from 0 to 65535 (0 selects an available port).')
    result.port = value.port
  }
  if (value.publicOrigin !== undefined) {
    if (typeof value.publicOrigin !== 'string') throw new TypeError('publicOrigin must be a URL or an empty string.')
    const text = value.publicOrigin.trim()
    if (text) {
      const url = new URL(text)
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
        throw new TypeError('Enter the HTTPS forwarding base URL, for example https://example.com/dsh (without the MCP path or query).')
      }
      result.publicOrigin = url.href.replace(/\/+$/, '')
    } else result.publicOrigin = ''
  }
  return result
}

export function createMcpController(ctx, options = {}) {
  const profile = getService(ctx, 'profileContext')
  const configPath = options.configPath ?? join(profile?.dir ?? join(homedir(), '.dsh'), 'dsh-dots', 'mcp.json')
  const loadServer = options.loadServer ?? (() => import('./mcp-server.mjs'))
  let prefs = defaults(), loaded = false, runtime, peer, error = '', lastCall = null, lastCheck = null, disposed = false
  const checks = new Set()
  let serial = Promise.resolve()
  const enqueue = action => {
    const operation = serial.then(action)
    serial = operation.catch(() => {})
    return operation
  }
  const message = cause => String(cause?.message ?? cause).split(prefs.token || '\0').join('[connection-key]')
  async function load() {
    if (loaded) return
    try {
      const data = JSON.parse(await readFile(configPath, 'utf8'))
      prefs = validatePreferences(data)
      if (typeof data.token === 'string' && /^[A-Za-z0-9_-]+$/.test(data.token)) prefs.token = data.token
    } catch (cause) { if (cause.code !== 'ENOENT') throw cause }
    loaded = true
  }
  async function save(value = prefs) {
    await mkdir(dirname(configPath), { recursive: true, mode: 0o700 })
    const temporary = `${configPath}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' })
      await rename(temporary, configPath)
    } finally { await rm(temporary, { force: true }) }
  }
  async function stop() {
    lastCheck = null
    for (const check of checks) check.abort()
    checks.clear()
    const old = runtime, oldPeer = peer
    runtime = undefined; peer = undefined
    try { await old?.close() } finally {
      try { await oldPeer?.dispose() } finally { await options.onStop?.() }
    }
  }
  async function reconcile() {
    if (disposed || !prefs.enabled) { await stop(); return }
    if (runtime) return
    const connection = getService(ctx, 'connection')
    if (!connection?.createPeer) throw new Error('DSH connection service does not expose createPeer in this environment.')
    if (!prefs.token) { prefs.token = randomBytes(32).toString('base64url'); await save() }
    const events = options.events?.()
    await events?.initialize?.()
    const { startMcpServer } = await loadServer()
    peer = connection.createPeer({ principal: { kind: 'owner' }, interactions: 'answer' })
    try {
      runtime = await startMcpServer({ adapter: createDshAdapter(ctx, peer), token: prefs.token,
        port: prefs.port, publicOrigin: prefs.publicOrigin, events,
        onCall: info => { lastCall = { ...info, ...(info.error ? { error: message(info.error) } : {}) } },
        onError: cause => { error = message(cause) },
      })
      if (prefs.port !== runtime.port) { prefs.port = runtime.port; await save() }
      error = ''
    } catch (cause) { await stop(); throw cause }
  }
  function status() {
    return {
      enabled: prefs.enabled, running: Boolean(runtime), state: runtime ? 'running' : error ? 'error' : 'off',
      port: runtime?.port ?? prefs.port, publicOrigin: prefs.publicOrigin,
      localUrl: runtime?.localUrl ?? '',
      publicUrl: runtime && prefs.publicOrigin ? prefs.publicOrigin + runtime.path : '',
      error, lastCall, lastCheck, guides: MCP_GUIDES,
      tools: createDshAdapter(ctx, peer).tools.map(({ name, description, annotations }) => ({ name, description, annotations })),
    }
  }
  const guarded = action => enqueue(async () => {
    try { await load(); return await action() }
    catch (cause) { error = message(cause); throw new Error(error, { cause }) }
  })
  return {
    status,
    initialize: () => guarded(async () => { await reconcile(); return status() }),
    configure: patch => guarded(async () => {
      if (disposed) throw new Error('Dots MCP plugin has been unloaded.')
      const next = validatePreferences(patch, prefs)
      const restart = next.port !== prefs.port || next.publicOrigin !== prefs.publicOrigin
      // Disable and persist MCP independently of tunnel-process cleanup.
      let stopFailure
      if (!next.enabled) {
        try { await stop() } catch (cause) { stopFailure = cause }
      }
      try { await save(next) } catch (cause) {
        if (!next.enabled) {
          prefs = { ...prefs, enabled: false }
          throw new Error('MCP is off, but saving this setting failed. The previous choice may be restored after DSH restarts.'
            + (stopFailure ? ' Tunnel cleanup also failed: ' + message(stopFailure) : ''), { cause })
        }
        throw cause
      }
      prefs = next
      if (!prefs.enabled) {
        if (stopFailure) {
          throw new Error('MCP has been disabled and its setting saved, but tunnel cleanup failed: ' + message(stopFailure),
            { cause: stopFailure })
        }
        error = ''
        return status()
      }
      if (restart) await stop()
      error = ''
      await reconcile()
      return status()
    }),
    rotate: () => guarded(async () => {
      const restoreTunnel = options.tunnelRunning?.() === true
      await stop()
      prefs.token = randomBytes(32).toString('base64url')
      await save(); error = ''; lastCall = null; lastCheck = null
      await options.events?.()?.revokeConnection?.()
      await reconcile()
      if (restoreTunnel) await options.restartTunnel?.()
      return status()
    }),
    async check(signal) {
      const target = runtime
      if (!target) throw new Error('Enable MCP before running the local connection check.')
      const check = new AbortController()
      checks.add(check)
      const requestSignal = signal ? AbortSignal.any([signal, check.signal]) : check.signal
      try {
        const response = await fetch(target.localUrl, { method: 'POST', signal: requestSignal,
          headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 'dsh-dots-local-check', method: 'tools/list', params: {} }),
        })
        const text = await response.text()
        if (requestSignal.aborted || runtime !== target) return status()
        const payload = response.headers.get('content-type')?.includes('text/event-stream')
          ? JSON.parse(text.split('\n').find(line => line.startsWith('data: '))?.slice(6) ?? '{}') : JSON.parse(text)
        if (!response.ok || payload.error || !Array.isArray(payload.result?.tools)) {
          throw new Error(payload.error?.message ?? `Local MCP check failed (HTTP ${response.status}).`)
        }
        lastCheck = { at: new Date().toISOString(), ok: true, toolCount: payload.result.tools.length }
        return status()
      } catch (cause) {
        if (requestSignal.aborted || runtime !== target) return status()
        lastCheck = { at: new Date().toISOString(), ok: false, error: message(cause) }
        throw new Error(message(cause), { cause })
      } finally { checks.delete(check) }
    },
    suspend: () => enqueue(stop),
    dispose: () => enqueue(async () => { disposed = true; await stop() }),
  }
}

/** These endpoints use DSH's authenticated UI transport; the public MCP endpoint cannot change this configuration. */
export function registerMcpTransport(connection, controller) {
  const disposers = ['status', 'configure', 'check', 'rotate'].map(endpoint => {
    const method = `dsh-dots-mcp/${endpoint}`
    return connection.fetch.register({ path: `/api/${method}`, methods: ['POST'], requestBody: 'buffered',
      async fetch(request) {
        if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return new Response('Expected JSON', { status: 415 })
        let body
        try { body = await request.json() } catch { return new Response('Invalid JSON', { status: 400 }) }
        if (body?.type !== 'client-request' || body.method !== method || typeof body.rpcId !== 'string' || !body.rpcId) return new Response('Invalid DSH request', { status: 400 })
        try {
          request.signal.throwIfAborted()
          const value = endpoint === 'configure' ? await controller.configure(body.payload)
            : endpoint === 'check' ? await controller.check(request.signal) : await controller[endpoint]()
          return Response.json({ type: 'server-response', rpcId: body.rpcId, result: { ok: true, value } })
        } catch (cause) {
          return Response.json({ type: 'server-response', rpcId: body.rpcId, result: { ok: false,
            error: { code: 'dsh_dots_mcp', message: String(cause?.message ?? cause), details: { issues: [] } } } })
        }
      },
    })
  })
  return async () => { for (const dispose of disposers.reverse()) await dispose() }
}
