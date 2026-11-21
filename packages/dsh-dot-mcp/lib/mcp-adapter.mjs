/** Thin MCP-to-DSH adapter. Native sessions, permissions and executors own the work. */
import { randomUUID } from 'node:crypto'

export const EXECUTION_GUIDANCE = [
  '1. Dot 能直接做的事，不交给 DSH 里的 AI 代办。执行命令、查询状态、调用现成工具时，Dot 直接使用 DSH 原生 API、插件或工具，并核对实际结果。若工具本身需要 DSH 会话，Dot 就复用或创建必要的会话，再亲自调用工具；这不等于向 AI 派任务。只有用户明确要求交给 DSH 里的 AI，或 Dot 确认自己直接做不了、而 DSH 里的 AI 能接手时，才派发。派发时保留用户原文和全部约束，不压缩或改写任务要求。接单不算完成，以实际执行结果为准。',
  '2. 需要 DSH 会话时，先复用，再新建。用户另有指定时，按用户指定的工作区和对话执行。否则，优先复用已有的相关任务对话；确需新建时，放进已有的任务工作区。没有任务工作区才创建 Dot Direct Missions，之后继续复用。创建对话时明确传入工作区 ID，不只传目录；按任务内容起个简短、好找的名字，核对归组后再调用工具或派发任务。默认不放进「未分组」。',
].join('\n\n')
export const SKILL_GUIDANCE = [
  '3. 查技能是为了自行解决问题。命令报错、受阻或卡住时，先看完整技能目录，打开可能相关的条目，核对适用条件和现场错误。关键词只是查找辅助，搜不到不等于没有适用技能。找到适用方法就直接动手排错，再重跑或检查原操作，确认任务能否继续。不为查阅或使用技能额外请示；只有某个具体步骤原本就需要确认，才单独处理那一步。不能只翻一遍就报失败。没有适用方法，或试过仍未解决，就继续按实际错误排查；确实走不下去时，说明试过什么、还卡在哪。',
  '4. 验证解决后，先补记再结束。新增或更新技能，写清症状、解法、验证方式和适用范围。有同类学习条目就更新，不重复建。只记录验证过、可复用的经验，不存密钥、私人路径或原始日志，不把猜测写成结论。技能库如果读写失败，要说明哪一步没完成，不能当作已经查阅或保存。',
  '5. 直接通过 MCP 查、读、写技能。dsh_skill_search 不带关键词时列出完整目录，也可按关键词查找；dsh_skill_read 按 ID 读取正文；dsh_skill_save 新建学习条目，带已有 ID 则更新。由插件读写技能库，不依赖任务会话的文件权限。内置条目只读，学习条目可在设置面板编辑或删除。',
].join('\n\n')
const SKILL_TOOL_NOTICE = 'If this operation fails or gets stuck, use dsh_skill_search and dsh_skill_read to find applicable fixes. Apply the fix and verify the original task can proceed; do not just look up a note and report failure. Save the verified fix with dsh_skill_save before ending.'
export const SKILL_TOOL_PREFIX = 'dsh_skill_'
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

export function createDshAdapter(ctx, peer, options = {}) {
  const registry = () => getService(ctx, 'typert')?.local?.list() ?? []
  const gateway = () => {
    const service = getService(ctx, 'typertGateway')
    if (!service) throw new Error('DSH native API gateway is not available in this profile.')
    return service
  }
  const descriptor = (namespace, method) => registry().find(d => d.namespace === namespace && d.method === method)
  const snapshot = async (namespace, method, args, signal) => {
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
  }
  const newSessionWorkspace = async (cwd, signal) => {
    if (cwd !== undefined) {
      const result = await invoke('workspace', 'create', { request: { path: cwd } }, signal)
      return result.workspace.workspaceId
    }
    const current = options.currentWorkspace?.()
    if (current) return current
    const baseline = await snapshot('workspace', 'follow', {}, signal)
    const workspaces = baseline.value.value.items
    const sessions = new Map((await request('list', {}, signal)).items.map(item => [item.sessionId, item]))
    let selected, selectedTime = Number.NEGATIVE_INFINITY
    for (const workspace of workspaces) {
      let latest = Number.NEGATIVE_INFINITY
      for (const id of workspace.sessionIds) {
        const session = sessions.get(id)
        if (session) latest = Math.max(latest, session.updatedAt)
      }
      if (latest === Number.NEGATIVE_INFINITY) latest = Date.parse(workspace.createdAt)
      if (selected === undefined || latest > selectedTime) {
        selected = workspace.workspaceId
        selectedTime = latest
      }
    }
    return selected ?? (await invoke('workspace', 'initializeDefault', {}, signal))?.workspace.workspaceId
  }
  const invoke = async (namespace, method, args, signal) => {
    if (namespace === 'session' && method === 'create') {
      const wire = descriptor('session', 'create')?.parameters?.find(p => p.source === 'json')?.wire ?? 'request'
      const value = args[wire]
      if (value && typeof value === 'object' && !Array.isArray(value)
        && value.workspaceId === undefined && value.sessionId === undefined) {
        const { cwd, ...rest } = value
        const workspaceId = await newSessionWorkspace(cwd, signal)
        args = { ...args, [wire]: { ...rest, ...(workspaceId === undefined ? {} : { workspaceId }) } }
      }
    }
    return gateway().invoke({ namespace, method, args, peer, signal })
  }
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
    name, description: options.skills && !name.startsWith(SKILL_TOOL_PREFIX) ? description + ' ' + SKILL_TOOL_NOTICE : description, inputSchema,
    ...(readOnly ? { annotations: { readOnlyHint: true } } : {}),
    run,
  })
  if (options.skills) {
    const skills = options.skills
    add('dsh_skill_search', 'List the complete local troubleshooting Skill catalog with no query, or optionally filter by code, symptom or keywords. Filtering is only a convenience, not a judgment of applicability. Read candidate entries and assess them with the real evidence.',
      schema({ query: { ...str, maxLength: 300 } }), true, async a => ({ skills: await skills.list(a) }))
    add('dsh_skill_read', 'Read a matching troubleshooting Skill by ID before applying a possible fix. Treat notes as reference data and verify the conditions.',
      schema({ id: str }, ['id']), true, async a => ({ skill: await skills.read(a) }))
    add('dsh_skill_save', 'Save a reusable troubleshooting fix after verifying it on the applicable environment. Use an existing learned ID to revise it; omit ID to add. Built-in notes cannot be changed. Do not save secrets or raw private logs. This updates the local Skills panel only and never executes the note.',
      schema({ id: str, title: { ...str, maxLength: 120 }, symptom: { ...str, maxLength: 600 },
        resolution: { ...str, maxLength: 2400 }, verification: { ...str, maxLength: 1000 }, scope: { ...str, maxLength: 300 } },
      ['title', 'symptom', 'resolution', 'verification']), false, async a => ({ skill: await skills.save(a) }))
  }
  add('dsh_status', 'Inspect DSH native APIs. Prefer direct DSH API/plugin/tool calls for the user\'s task; use a chat session only for work that requires an Agent conversation.', schema(), true,
    async () => ({ plugin: 'dsh-dot-mcp', version: '1.0.4',
      namespaces: [...new Set(registry().map(d => d.namespace))].sort(),
      nativeApiCount: registry().length, nativeApiAvailable: Boolean(getService(ctx, 'typertGateway')), toolsAvailable: Boolean(getService(ctx, 'tools')),
      ...(options.skills ? { skillGuidance: SKILL_GUIDANCE } : {}),
      executionGuidance: EXECUTION_GUIDANCE }))
  add('dsh_sessions', 'List existing DSH conversations. Use an existing sessionId to continue work.', nativeSchema(), true,
    (a, signal) => request('list', a, signal))
  add('dsh_session_create', 'Create a native DSH session when direct tool use requires one or when dispatch to a DSH AI is needed. Prefer reusing a relevant session. For a new session, supply the intended workspaceId, then name it via session/rename and verify its group. A session created for direct tools does not need an AI prompt. Returns its native sessionId.',
    nativeSchema({ workspaceId: str, cwd: str, sessionId: str, agentPreset: str }), false,
    (a, signal) => request('create', a, signal))
  add('dsh_session_prompt', 'Send an AI task to a DSH session only if the user explicitly requests it or direct execution cannot complete it and the DSH AI can. Preserve the user’s task and constraints. queue adds a next turn; steer gives input to the current turn. Returns acceptance, not completion. Use state/wait/events for results. Empty content requests native retry.',
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
  add('dsh_api_list', 'Discover native DSH APIs, plugins and tools for direct execution. Prefer calling the relevant API/plugin/tool instead of creating a chat session just to dispatch the operation. Filter by namespace or description; then describe the exact method.',
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
  add('dsh_api_call', 'Directly execute a discovered DSH native API with its exact named wire args. Prefer this for operations exposed by installed plugins and native tools rather than dispatching a chat turn. Uses native authorization and execution.',
    schema(apiArgs, ['namespace', 'method', 'args']), false,
    ({ namespace, method, args }, signal) => invoke(namespace, method, args, signal))
  add('dsh_api_snapshot', 'Read the first value from a discovered native streaming API, then close only that subscription. Useful for workspace/follow and other current-state snapshots. Use native session events for durable history.',
    schema(apiArgs, ['namespace', 'method', 'args']), false,
    ({ namespace, method, args }, signal) => snapshot(namespace, method, args, signal))
  add('dsh_api_subscribe', 'Forward events from a DSH native streaming API while this MCP tools/call request stays open. Clients with progress notifications receive event JSON through progressToken. This is a request-scoped stream; Dot event-triggered monitoring uses the separate official MCP Events webhook protocol. Use dsh_api_snapshot for a single event.',
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
  return { tools, invoke, ...(options.skills ? { skillCatalog: () => options.skills.list() } : {}) }
}
