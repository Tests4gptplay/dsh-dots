/** DSH Dots: original browser panel plus user-invoked Desktop login persistence maintenance. */
import { createMcpController, registerMcpTransport } from './mcp-control.mjs'
import { createTunnelController, registerTunnelTransport } from './tunnel-control.mjs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { inspect, applyPersistence, restorePersistence } from './persistence.mjs'

export const name = 'dsh-dots'
export const inject = []

const PATH = 'dsh-dots-persistence'
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
    scoped.effect(() => registerPersistenceTransport(scoped.connection), 'dsh-dots: persistence settings RPC')
    let tunnel
    const controller = createMcpController(scoped, { onStop: () => tunnel?.suspend() })
    const profile = scoped.get?.('profileContext') ?? scoped.profileContext
    tunnel = createTunnelController({ dataDir: join(profile?.dir ?? join(homedir(), '.dsh'), 'dsh-dots'), mcp: controller })
    scoped.effect(() => {
      const unregister = registerMcpTransport(scoped.connection, controller)
      const unregisterTunnel = registerTunnelTransport(scoped.connection, tunnel)
      // Startup failures remain visible in Settings; no background retry loop.
      void controller.initialize().catch(() => {})
      return async () => { await unregisterTunnel(); await unregister(); await tunnel.dispose(); await controller.dispose() }
    }, 'dsh-dots: optional MCP settings and lifetime')
  })
}
