/** Thin MCP-to-DSH adapter. Native sessions, permissions and executors own the work. */
import { randomUUID } from 'node:crypto'

const str = { type: 'string' }
const obj = { type: 'object', additionalProperties: true }
// Numeric domains belong to the native API (for example, cursors can be -1).
const integer = { type: 'integer' }
const schema = (properties = {}, required = [], additionalProperties = false) => ({ type: 'object', properties, required, additionalProperties })
const nativeSchema = (properties = {}, required = []) => schema(properties, required, true)
const session = { sessionId: { ...str, description: 'Native DSH Session ID returned by create/list.' } }
const apiArgs = { namespace: str, method: str, args: { ...obj, description: 'Exact named wire arguments from dsh_api_describe.' } }
export const getService = (ctx, name) => ctx.get?.(name) ?? ctx[name]

function describeMethod(d) {
  const properties = {}, required = []
  for (const p of d.parameters ?? []) {
    properties[p.wire] = p.codec?.jsonSchema ?? { description: p.description ?? p.codec?.typeSymbol ?? p.wire }
    if (!p.acceptsUndefined) required.push(p.wire)
  }
  if (d.invocation?.kind === 'context') {
    properties[d.invocation.wire] = d.invocation.codec?.jsonSchema ?? { type: 'string' }
    required.push(d.invocation.wire)
  }
  return {
    namespace: d.namespace, method: d.method, description: d.description ?? '',
    mode: d.mode ?? 'unary', inputSchema: schema(properties, [...new Set(required)]),
    outputSchema: d.result?.jsonSchema ?? null,
  }
}

export function createDshAdapter(ctx, peer) {
  const registry = () => getService(ctx, 'typert')?.local?.list() ?? []
  const gateway = () => {
    const service = getService(ctx, 'typertGateway')
    if (!service) throw new Error('DSH native API gateway is not available in this profile.')
    return service
  }
  const descriptor = (namespace, method) => registry().find(d => d.namespace === namespace && d.method === method)
  const invoke = (namespace, method, args, signal) => gateway().invoke({ namespace, method, args, peer, signal })
  const request = (method, value, signal) => {
    const d = descriptor('session', method)
    // Reflection preserves the actual wire name (list currently names its argument _request).
    const parameter = d?.parameters?.find(p => p.source === 'json')
    return invoke('session', method, { [parameter?.wire ?? (method === 'list' ? '_request' : 'request')]: value }, signal)
  }
  const tools = []
  // Publish only properties known from the fixed tool contract.
  // Generic DSH operations determine their own effects; do not invent risk classifications.
  const add = (name, description, inputSchema, readOnly, run) => tools.push({
    name, description, inputSchema,
    ...(readOnly ? { annotations: { readOnlyHint: true } } : {}),
    run,
  })
  add('dsh_status', 'Inspect the connected DSH environment and available native API namespaces. This does not start a task.', schema(), true,
    async () => ({ plugin: 'dsh-dots', version: '2.0.1-test.5',
      namespaces: [...new Set(registry().map(d => d.namespace))].sort(),
      nativeApiCount: registry().length, nativeApiAvailable: Boolean(getService(ctx, 'typertGateway')), toolsAvailable: Boolean(getService(ctx, 'tools')) }))
  add('dsh_sessions', 'List existing DSH conversations. Use an existing sessionId to continue work.', nativeSchema(), true,
    (a, signal) => request('list', a, signal))
  add('dsh_session_create', 'Create a native DSH conversation in a workspace or directory. Returns its sessionId; DSH owns its lifetime.',
    nativeSchema({ workspaceId: str, cwd: str, sessionId: str, agentPreset: str }), false,
    (a, signal) => request('create', a, signal))
  add('dsh_session_prompt', 'Send or append instructions to a DSH session. queue adds a next turn; steer gives input to the current turn. Returns acceptance, not completion. Use state/wait/events for results. Empty content requests native retry.',
    nativeSchema({ ...session, text: { ...str, description: 'Convenience text, prepended to content when both are supplied.' }, content: { type: 'array', items: obj }, mode: { ...str, description: 'Native delivery mode; queue adds a turn, steer updates the current turn.' }, requestId: str, clientTimeZone: str }, ['sessionId']), false,
    async (a, signal) => {
      const { text, content, ...native } = a
      const requestId = a.requestId ?? randomUUID()
      const parts = text === undefined ? content : [{ type: 'text', text }, ...(content ?? [])]
      const result = await request('prompt', { ...native, requestId, mode: a.mode ?? 'queue',
        ...(parts === undefined ? {} : { content: parts }) }, signal)
      return { ...result, sessionId: a.sessionId, requestId }
    })
  add('dsh_session_state', 'Read the native current state, including running, idle, pending input and errors.', nativeSchema(session, ['sessionId']), true,
    (a, signal) => request('state', a, signal))
  add('dsh_session_wait', 'Wait using DSH native session lifecycle. Returns idle, input-required or timeout with state and output. timeoutMs is the native wait budget; it never cancels the task.',
    nativeSchema({ ...session, timeoutMs: integer, afterSeq: { ...integer, description: 'Native exclusive sequence cursor; -1 starts before the first event.' }, maxMessages: integer }, ['sessionId']), true,
    (a, signal) => request('wait', a, signal))
  add('dsh_session_events', 'Read persisted DSH messages and execution events, using native sequence cursors for paging.',
    nativeSchema({ ...session, throughSeq: { ...integer, description: 'Native inclusive sequence cursor; -1 selects an empty history.' }, beforeSeq: integer, maxMessages: integer, turnWindow: obj }, ['sessionId']), true,
    ({ sessionId, ...rest }, signal) => request('events', { address: { kind: 'session', sessionId }, ...rest }, signal))
  add('dsh_session_cancel', 'Explicitly cancel the named native session turn. Turning off the MCP connection does not call this tool.', nativeSchema(session, ['sessionId']), false,
    (a, signal) => request('cancel', a, signal))
  add('dsh_model_catalog', 'List provider/model choices offered by the current DSH profile.', schema(), true,
    (_a, signal) => invoke('session', 'modelCatalog', {}, signal))
  add('dsh_session_model', 'Select a native provider, model and optional reasoning effort for future turns of a session.',
    nativeSchema({ ...session, provider: str, model: str, reasoningEffort: str }, ['sessionId', 'provider', 'model']), false,
    (a, signal) => request('selectModel', a, signal))
  add('dsh_api_list', 'Discover all currently registered DSH native API methods, including workspace, files, terminal, jobs, agents, configuration and installed plugins. Filter by namespace or description; then describe the exact method.',
    schema({ namespace: str, query: str }), true,
    async ({ namespace, query }) => ({ methods: registry().filter(d => (!namespace || d.namespace === namespace)
      && (!query || `${d.namespace}/${d.method} ${d.description ?? ''}`.toLowerCase().includes(query.toLowerCase())))
      .map(d => ({ namespace: d.namespace, method: d.method, mode: d.mode ?? 'unary', description: d.description ?? '' })) }))
  add('dsh_api_describe', 'Get the actual named arguments and JSON schema of a discovered native DSH API method. Lookup parameters use their wire names, such as agentId.',
    schema({ namespace: str, method: str }, ['namespace', 'method']), true,
    async ({ namespace, method }) => {
      const d = descriptor(namespace, method)
      if (!d) throw new Error(`Native API ${namespace}/${method} is not registered. Use dsh_api_list to inspect this profile.`)
      return describeMethod(d)
    })
  add('dsh_api_call', 'Invoke a discovered unary DSH API with its exact named wire args. Uses native validation, resource authorization and execution. This can write files/configuration or manage plugins depending on the selected method.',
    schema(apiArgs, ['namespace', 'method', 'args']), false,
    ({ namespace, method, args }, signal) => invoke(namespace, method, args, signal))
  add('dsh_api_snapshot', 'Read the first value from a discovered native streaming API, then close only that subscription. Useful for workspace/follow and other current-state snapshots. Use native session events for durable history.',
    schema(apiArgs, ['namespace', 'method', 'args']), false,
    async ({ namespace, method, args }, signal) => {
      const lifetime = new AbortController()
      const combined = signal ? AbortSignal.any([signal, lifetime.signal]) : lifetime.signal
      let iterator
      try {
        const stream = await gateway().stream({ namespace, method, args, peer, signal: combined })
        iterator = stream[Symbol.asyncIterator]()
        const first = await iterator.next()
        return { done: first.done === true, value: first.value ?? null }
      } finally {
        lifetime.abort()
        if (iterator?.return) await iterator.return()
      }
    })
  add('dsh_api_subscribe', 'Continuously forward every event from a DSH native streaming API, using the MCP request progress stream. The MCP caller supplies a progressToken and receives the complete event JSON in each progress message. The subscription ends on native stream completion or caller cancellation; use dsh_api_snapshot for a single event.',
    schema(apiArgs, ['namespace', 'method', 'args']), false,
    async ({ namespace, method, args }, signal, mcpReq) => {
      const progressToken = mcpReq?._meta?.progressToken
      if (progressToken === undefined) {
        throw new Error('Continuous DSH streaming requires the MCP client to request progress notifications (progressToken). Use dsh_api_snapshot to read one event.')
      }
      const stream = await gateway().stream({ namespace, method, args, peer, signal })
      const iterator = stream[Symbol.asyncIterator]()
      let events = 0
      try {
        for (;;) {
          signal?.throwIfAborted()
          const frame = await iterator.next()
          if (frame.done) break
          signal?.throwIfAborted()
          await mcpReq.notify({
            method: 'notifications/progress',
            params: { progressToken, progress: ++events, message: JSON.stringify(frame.value ?? null, (_key, value) => typeof value === 'bigint' ? String(value) : value) },
          })
        }
        return { namespace, method, events, completed: true }
      } finally {
        if (iterator.return) await iterator.return()
      }
    })
  const withTools = async (sessionId, signal, action) => {
    const controller = getService(ctx, 'sessionController')
    const nativeTools = getService(ctx, 'tools')
    if (!controller || !nativeTools) throw new Error('DSH session controller or native tools are not loaded.')
    const resolved = await controller.resolveAgent(sessionId)
    if (resolved.error) throw resolved.error
    const agent = resolved.agent
    const modelSelection = agent.model.current()
    // Unconfigured sessions can still inspect globally available tools.
    const toolSet = modelSelection ? await nativeTools.resolve({ agent, modelSelection, signal }) : undefined
    try { return await action(nativeTools, agent, toolSet) } finally { toolSet?.dispose() }
  }
  add('dsh_tools', 'List DSH native tools and argument schemas for a session, including installed file, shell, computer-use and plugin tools when enabled in that session.',
    schema(session, ['sessionId']), true,
    ({ sessionId }, signal) => withTools(sessionId, signal, async (nativeTools, agent, toolSet) => ({ tools: nativeTools.schemas(agent, toolSet) })))
  add('dsh_tool_call', 'Execute a native DSH tool in a session through the existing executor and approval policy. Use dsh_tools for its actual schema. Native background jobs keep their native job IDs.',
    schema({ ...session, name: str, arguments: obj }, ['sessionId', 'name', 'arguments']), false,
    ({ sessionId, name, arguments: args }, signal) => withTools(sessionId, signal, async (nativeTools, agent, toolSet) => {
      const result = await nativeTools.execute({ calls: [{ type: 'tool-call', id: randomUUID(), name, arguments: JSON.stringify(args) }], agent, toolSet, signal })
      const value = { sessionId, ...result }
      const images = []
      for (const item of result.results ?? []) {
        for (const block of item.result?.content ?? []) {
          if (block.type !== 'image' || !block.attachment) continue
          const image = await request('attachment', { sessionId, attachment: block.attachment }, signal)
          images.push({ type: 'image', data: image.data, mimeType: image.attachment.mediaType })
        }
      }
      // Keep native structured output intact; image blocks belong to the MCP presentation.
      Object.defineProperty(value, Symbol.for('dsh-dots.mcpContent'), { value: images })
      return value
    }))
  return { tools, invoke }
}
