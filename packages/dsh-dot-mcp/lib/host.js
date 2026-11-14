/** DSH Dots: original browser panel plus user-invoked Desktop login persistence maintenance. */
import { createMcpController, registerMcpTransport } from './mcp-control.mjs'
import { createTunnelController, registerTunnelTransport } from './tunnel-control.mjs'
import { createNotificationController, registerNotificationTransport } from './notify-control.mjs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { inspect, applyPersistence, restorePersistence } from './persistence.mjs'

export const name = 'dsh-dot-mcp'
export const inject = []

/** Release each owned resource even if another shutdown step reports a concrete failure. */
export async function disposeDotsResources(unregisterTunnel, unregisterMcp, tunnel, controller, unregisterNotify, notify) {
  const errors = []
  for (const action of [unregisterTunnel, unregisterMcp, unregisterNotify, () => tunnel.dispose(), () => controller.dispose(), () => notify?.dispose()].filter(Boolean)) {
    try { await action() } catch (error) { errors.push(error) }
  }
  if (errors.length === 1) throw errors[0]
  if (errors.length > 1) throw new AggregateError(errors, 'Dots cleanup encountered multiple errors.')
}

/**
 * Restore an enabled Tunnel through the same start(payload) path as the Settings button.
 * The single in-flight action also supplies the final state to an early Settings request.
 */
export function createTunnelStartup(tunnel) {
  let pending
  const restore = () => {
    if (pending) return pending
    const started = (async () => {
      const saved = await tunnel.status()
      if (!saved.enabled || saved.running) return saved
      return tunnel.start({
        installDirectory: saved.installDirectory,
        executable: saved.executable,
        tunnelId: saved.tunnelId,
      })
    })()
    pending = started
    void started.finally(() => { if (pending === started) pending = undefined }).catch(() => {})
    return started
  }
  return {
    restore,
    async status() {
      if (pending) await pending.catch(() => {})
      return tunnel.status()
    },
  }
}

const PATH = 'dsh-dot-mcp-persistence'
const METHODS = ['status', 'apply', 'restore']

export function registerPersistenceTransport(connection, service = { inspect, applyPersistence, restorePersistence }) {
  const dispose = []
  for (const endpoint of METHODS) {
    const method = `${PATH}/${endpoint}`
    dispose.push(connection.fetch.register({
      path: `/api/${method}`, methods: ['POST'], requestBody: 'buffered',
      async fetch(request) {
        if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
          return new Response('Expected JSON', { status: 415 })
        }
        let data
        try { data = await request.json() } catch { return new Response('Invalid JSON', { status: 400 }) }
        if (data?.type !== 'client-request' || data.method !== method || typeof data.rpcId !== 'string' || data.rpcId.length === 0) {
          return new Response('Invalid DSH request', { status: 400 })
        }
        let result
        try {
          request.signal.throwIfAborted()
          switch (endpoint) {
            case 'status': result = await service.inspect(); break
            case 'apply': result = await service.applyPersistence(); break
            case 'restore': result = await service.restorePersistence(); break
          }
          return Response.json({ type: 'server-response', rpcId: data.rpcId, result: { ok: true, value: result } })
        } catch (error) {
          return Response.json({ type: 'server-response', rpcId: data.rpcId,
            result: { ok: false, error: { code: 'dsh_dots_persistence',
              message: error instanceof Error ? error.message : String(error), details: { issues: [] } } } })
        }
      },
    }))
  }
  return async () => { await Promise.all(dispose.reverse().map(fn => fn())) }
}
export function apply(ctx) {
  ctx.inject(['connection'], scoped => {
    scoped.effect(() => registerPersistenceTransport(scoped.connection), 'dsh-dot-mcp: persistence settings RPC')
    let tunnel, notify, startup
    const controller = createMcpController(scoped, {
      onStop: () => tunnel?.suspend(),
      tunnelRunning: () => tunnel?.isRunning() === true,
      restartTunnel: () => tunnel?.isRunning() ? undefined : tunnel?.start(),
      onReady: () => {
        // Launch once from the existing MCP-ready signal; do not hold MCP startup open.
        void startup.restore().catch(cause => console.error('DSH Dots: tunnel auto-resume failed:', String(cause?.message ?? cause)))
      },
      events: () => notify,
    })
    const profile = scoped.get?.('profileContext') ?? scoped.profileContext
    const dataDir = join(profile?.dir ?? join(homedir(), '.dsh'), 'dsh-dots')
    tunnel = createTunnelController({ dataDir, mcp: controller })
    startup = createTunnelStartup(tunnel)
    notify = createNotificationController(scoped, { dataDir, canDeliver: () => controller.status().running })
    scoped.effect(() => {
      const unregister = registerMcpTransport(scoped.connection, controller)
      const unregisterTunnel = registerTunnelTransport(scoped.connection, { ...tunnel, status: startup.status })
      const unregisterNotify = registerNotificationTransport(scoped.connection, notify)
      // Startup reads the opt-in notification scope before advertising MCP events.
      void controller.initialize().catch(() => {})
      return () => disposeDotsResources(unregisterTunnel, unregister, tunnel, controller, unregisterNotify, notify)
    }, 'dsh-dot-mcp: optional MCP settings and lifetime')
  })
}
