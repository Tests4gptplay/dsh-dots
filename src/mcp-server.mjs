/** Official MCP SDK transport; only the HTTP carrier belongs to this plugin. */
import { createServer } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { McpServer, createMcpHandler, fromJsonSchema } from '@modelcontextprotocol/server'
import { toNodeHandler, hostHeaderValidation, originValidation } from '@modelcontextprotocol/node'
import * as z from 'zod/v4'

export const VERSION = '1.0.1-test.1'
// The SDK requires a finite byte count. Use the JavaScript counting boundary,
// not a product-specific file/message quota, in both HTTP layers.
const maxRequestBodySize = Number.MAX_SAFE_INTEGER
export function resultOf(value) {
  const normalized = JSON.parse(JSON.stringify(value ?? null, (_k, v) => typeof v === 'bigint' ? String(v) : v))
  const data = normalized !== null && !Array.isArray(normalized) && typeof normalized === 'object' ? normalized : { value: normalized }
  const isError = data.isError === true || data.results?.some(item => item.result?.isError === true) === true
  const media = [...(value?.[Symbol.for('dsh-dots.mcpContent')] ?? [])]
  if (typeof data.data === 'string' && data.attachment?.mediaType?.startsWith('image/')) {
    media.push({ type: 'image', data: data.data, mimeType: data.attachment.mediaType })
    // The MCP image block carries these bytes; keep the attachment metadata in text/structured output.
    delete data.data
  }
  return { content: [{ type: 'text', text: JSON.stringify(data) }, ...media], structuredContent: data, ...(isError ? { isError: true } : {}) }
}
export function makeHandler(adapter, { onCall = () => {}, onError = () => {}, events } = {}) {
  return createMcpHandler(() => {
    const server = new McpServer({ name: 'dsh-dot-mcp', version: VERSION }, { capabilities: events ? { events: {} } : {}, instructions:
      'DSH is the execution environment. When a DSH native API, installed plugin, or tool can perform the requested work, invoke it directly through this MCP connection, inspect its result, and respond. Use dsh_session_create and dsh_session_prompt for work that actually needs an Agent conversation or multi-turn execution, rather than dispatching direct tool operations to a separate chat. Reuse native session IDs. Create/prompt returns acceptance; use state, wait and events for completion. Discover APIs with dsh_api_list and describe. Follow DSH native approvals. MCP disconnection does not cancel accepted sessions.' })
    if (events) {
      for (const [method, action] of [
        ['events/list', 'list'], ['events/subscribe', 'subscribe'], ['events/unsubscribe', 'unsubscribe'],
      ]) {
        server.server.setRequestHandler(method, {
          params: z.record(z.string(), z.unknown()), result: z.unknown(),
        }, params => events[action](params ?? {}))
      }
    }
    if (events) server.server.registerCapabilities({ events: {} })
    for (const tool of adapter.tools) {
      server.registerTool(tool.name, { description: tool.description, annotations: tool.annotations,
        inputSchema: fromJsonSchema(tool.inputSchema) }, async (args, context) => {
        try {
          const result = resultOf(await tool.run(args, context.mcpReq.signal, context.mcpReq))
          onCall({ tool: tool.name, at: new Date().toISOString(), ok: result.isError !== true })
          return result
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          onCall({ tool: tool.name, at: new Date().toISOString(), ok: false, error: message })
          return { isError: true, content: [{ type: 'text', text: message }],
            structuredContent: { error: { code: error?.code ?? 'dsh_error', message, ...(error?.details ? { details: error.details } : {}) } } }
        }
      })
    }
    return server
  }, { legacy: 'stateless', keepAliveMs: 0, maxSubscriptions: Infinity, maxRequestBodySize, onerror: onError })
}

export async function startMcpServer({ adapter, token, port = 0, publicOrigin = '', onCall, onError = () => {}, events }) {
  const path = `/mcp/${token}`
  const paths = [path, ...(publicOrigin ? [new URL(publicOrigin).pathname.replace(/\/+$/, '') + path] : [])].map(value => Buffer.from(value))
  const allowedHosts = ['127.0.0.1', 'localhost', '[::1]']
  if (publicOrigin) allowedHosts.push(new URL(publicOrigin).hostname)
  const checkHost = hostHeaderValidation(allowedHosts)
  const checkOrigin = originValidation(allowedHosts)
  const handler = makeHandler(adapter, { onCall, onError, events })
  const nodeHandler = toNodeHandler(handler, { maxRequestBodySize })
  const sockets = new Set()
  let closed = false
  const http = createServer({ requestTimeout: 0 }, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    let requested
    try { requested = new URL(req.url, 'http://localhost').pathname } catch { res.writeHead(400).end(); return }
    const received = Buffer.from(requested)
    if (closed || !paths.some(expected => received.length === expected.length && timingSafeEqual(received, expected))) {
      res.writeHead(404).end('Not found'); return
    }
    if (!checkHost(req, res) || !checkOrigin(req, res)) return
    try { await nodeHandler(req, res) }
    catch (error) {
      onError(error)
      if (!res.headersSent) res.writeHead(500).end('MCP request failed')
      else res.destroy()
    }
  })
  http.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)) })
  try {
    await new Promise((resolve, reject) => {
      http.once('error', reject)
      http.listen(port, '127.0.0.1', () => { http.removeListener('error', reject); resolve() })
    })
  } catch (error) { await handler.close(); throw error }
  http.on('error', onError)
  return {
    port: http.address().port, path,
    localUrl: `http://127.0.0.1:${http.address().port}${path}`,
    async close() {
      if (closed) return
      closed = true
      const stopped = new Promise((resolve, reject) => http.close(error => error ? reject(error) : resolve()))
      for (const socket of sockets) socket.destroy()
      await Promise.all([stopped, handler.close()])
    },
  }
}
