/** Same Dots settings section, with official onboarding and copyable live connection data. */
Object.assign(zh, {
  persistenceNav: 'Dots', mcpTitle: 'MCP · 让 Dot 操作 DSH', mcpEnable: '启用 MCP Server',
  mcpDescription: '由 ChatGPT Dot 调用 DSH 的会话、工具和工作区。首次安装默认关闭；开关状态随当前 DSH 配置保存。',
  mcpOff: '已关闭', mcpRunning: '正在运行', mcpError: '连接错误', mcpLoading: '正在读取设置…',
  mcpPort: '本地端口（0 自动选择）', mcpPublic: 'HTTPS 转发地址（使用官方隧道时可留空）',
  mcpSave: '保存连接设置', mcpLocalUrl: '本机 MCP 地址', mcpPublicUrl: 'ChatGPT 注册地址',
  mcpSecret: '连接地址包含访问密钥，可操作当前 DSH。请仅交给你授权的客户端；需要撤销旧地址时使用“更换连接密钥”。',
  mcpCopy: '复制', mcpCopied: '已复制', mcpReveal: '显示地址', mcpHide: '隐藏地址',
  mcpRotate: '更换连接密钥', mcpChecking: '正在检查本地连接…',
  mcpCheck: '检查本地连接', mcpRefresh: '刷新状态', mcpLocalPassed: '本地 MCP 工具发现已通过',
  mcpLocalOnly: '本地检查验证服务入口；从 Dot 发起一次调用后，可在下方查看实际调用记录。',
  mcpLastCall: '最近一次 MCP 工具调用', mcpSuccess: '成功', mcpFailure: '失败', mcpNoCall: '尚未收到 MCP 工具调用',
  mcpTools: '提供给 Dot 的工具', mcpGuide: '连接到 ChatGPT Dot',
  mcpStep1: '1. 开启 MCP，点击“检查本地连接”，复制本机 MCP 地址。',
  mcpStep2: '2. 选择接入方式：按官方指南把 Secure MCP Tunnel 的 HTTP 目标设为本机地址；或将已有 HTTPS 转发指向本地端口，转发时保留 MCP 路径，并在上方保存 HTTPS 转发地址（可含部署路径前缀）。',
  mcpStep3: '3. 在 ChatGPT 网页版打开 Plugins → + → Add custom MCP server。隧道方式选择 Tunnel 及 tunnel_id；HTTPS 方式粘贴“ChatGPT 注册地址”。本服务使用地址中的访问密钥，在注册页选择 No authentication。',
  mcpStep4: '4. 创建并安装该插件，在真实 Dot 的插件配置中启用它。账户与工作区可用权限以官方注册页面为准。',
  mcpStep5: '5. 让 Dot“调用 dsh_status 查看 DSH，然后列出会话”。确认成功后创建会话、发送任务，并使用 state / wait / events 继续查看结果；执行授权由 DSH 原有机制处理。',
  mcpOffHelp: '关闭只停止 MCP 接入，不主动取消已提交的 DSH 会话任务。手机上的 Dot 使用相同的已配置连接；DSH 和隧道需保持运行。',
  mcpRegistration: '官方 MCP 注册指南', mcpTunnel: '官方 Secure MCP Tunnel 指南', mcpTunnelSettings: '官方隧道管理与下载', mcpDotGuide: '官方 Dot 与插件指南',
})
Object.assign(en, {
  persistenceNav: 'Dots', mcpTitle: 'MCP · Let your Dot operate DSH', mcpEnable: 'Enable MCP Server',
  mcpDescription: 'Let ChatGPT Dot use DSH sessions, tools and workspaces. Off on first installation; your choice is saved for this DSH profile.',
  mcpOff: 'Off', mcpRunning: 'Running', mcpError: 'Connection error', mcpLoading: 'Loading settings…',
  mcpPort: 'Local port (0 chooses an available port)', mcpPublic: 'HTTPS forwarding base URL (optional with Secure MCP Tunnel)',
  mcpSave: 'Save connection settings', mcpLocalUrl: 'Local MCP URL', mcpPublicUrl: 'ChatGPT registration URL',
  mcpSecret: 'The connection URL contains an access key with control of this DSH environment. Share it only with authorized clients. Rotate the key to revoke the old URL.',
  mcpCopy: 'Copy', mcpCopied: 'Copied', mcpReveal: 'Show URLs', mcpHide: 'Hide URLs',
  mcpRotate: 'Rotate connection key', mcpChecking: 'Checking local connection…',
  mcpCheck: 'Check local connection', mcpRefresh: 'Refresh status', mcpLocalPassed: 'Local MCP tool discovery passed',
  mcpLocalOnly: 'This checks the local endpoint. Make a call from your Dot to see an actual MCP tool call below.',
  mcpLastCall: 'Last MCP tool call', mcpSuccess: 'Succeeded', mcpFailure: 'Failed', mcpNoCall: 'No MCP tool call received yet',
  mcpTools: 'Tools available to your Dot', mcpGuide: 'Connect your ChatGPT Dot',
  mcpStep1: '1. Enable MCP, run the local connection check, and copy the local MCP URL.',
  mcpStep2: '2. Choose a connection: follow the official Secure MCP Tunnel guide and set its HTTP target to the local URL; or forward an existing HTTPS endpoint to the local port, preserve the MCP path when forwarding, and save its HTTPS base URL above (a deployment path prefix is supported).',
  mcpStep3: '3. In ChatGPT on the web, open Plugins → + → Add custom MCP server. Select Tunnel and its tunnel_id, or paste the ChatGPT registration URL for HTTPS. This server uses the access key in its URL; select No authentication in that form.',
  mcpStep4: '4. Create and install the plugin, then enable it in your real Dot’s plugin settings. The official registration page shows your account and workspace permissions.',
  mcpStep5: '5. Ask your Dot to “call dsh_status and list DSH sessions”. Then create a session, submit a task and use state / wait / events to follow its results. Native DSH approval mechanisms handle execution permissions.',
  mcpOffHelp: 'Turning MCP off stops the connection without actively cancelling accepted DSH session tasks. Your mobile Dot uses the same configured connection; keep DSH and the tunnel running.',
  mcpRegistration: 'Official MCP registration guide', mcpTunnel: 'Official Secure MCP Tunnel guide', mcpTunnelSettings: 'Official tunnel settings and download', mcpDotGuide: 'Official Dot and plugins guide',
})

function DotsMcpSettings({ t, mcpRpc }) {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const diagnostic = useRef(null)
  const [message, setMessage] = useState('')
  const [port, setPort] = useState('0')
  const [origin, setOrigin] = useState('')
  const [reveal, setReveal] = useState(false)
  const alive = useRef(true)
  const update = value => {
    if (!alive.current) return
    setStatus(value); setPort(String(value?.port ?? 0)); setOrigin(value?.publicOrigin ?? '')
  }
  useEffect(() => {
    alive.current = true
    const controller = new AbortController()
    mcpRpc('status', {}, controller.signal).then(update).catch(error => {
      if (!controller.signal.aborted && alive.current) setMessage(String(error.message || error))
    })
    return () => { alive.current = false; controller.abort(); diagnostic.current?.abort() }
  }, [])
  const act = async (endpoint, payload = {}) => {
    if (busy) return
    if (endpoint === 'configure' || endpoint === 'rotate') {
      diagnostic.current?.abort(); diagnostic.current = null; setChecking(false)
    }
    setBusy(true); setMessage('')
    try { update(await mcpRpc(endpoint, payload)) }
    catch (error) {
      if (alive.current) setMessage(String(error.message || error))
      try { update(await mcpRpc('status', {})) } catch { /* Keep the concrete action error. */ }
    } finally { if (alive.current) setBusy(false) }
  }
  const check = async () => {
    if (diagnostic.current) return
    const controller = new AbortController()
    diagnostic.current = controller; setChecking(true); setMessage('')
    try {
      const value = await mcpRpc('check', {}, controller.signal)
      if (!controller.signal.aborted) update(value)
    } catch (error) {
      if (!controller.signal.aborted && alive.current) setMessage(String(error.message || error))
    } finally {
      if (diagnostic.current === controller) {
        diagnostic.current = null
        if (alive.current) setChecking(false)
      }
    }
  }
  const copy = async value => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) await navigator.clipboard.writeText(value)
      else {
        const input = document.createElement('textarea')
        input.value = value; input.style.position = 'fixed'; input.style.opacity = '0'
        document.body.append(input)
        try { input.select(); if (!document.execCommand('copy')) throw new Error(t('mcpCopy') + ' failed') } finally { input.remove() }
      }
      if (alive.current) setMessage(t('mcpCopied'))
    } catch (error) { if (alive.current) setMessage(String(error.message || error)) }
  }
  const button = (key, onClick, disabled = false) => h('button', { type: 'button', className: 'dotsMcpButton', disabled: busy || disabled, onClick }, t(key))
  const connection = (label, value) => value ? h('div', { className: 'dotsMcpField' },
    h('label', null, t(label)), h('div', { className: 'dotsMcpRow' },
      h('input', { type: reveal ? 'text' : 'password', value, readOnly: true, 'aria-label': t(label), spellCheck: false }),
      button('mcpCopy', () => { void copy(value) }))) : null
  const guides = status?.guides ?? {
    registration: 'https://developers.openai.com/plugins/deploy/connect-chatgpt',
    registrationZh: 'https://help.openai.com/zh-hans-cn/articles/12584461-connecting-custom-mcp-servers-in-chatgpt',
    tunnel: 'https://developers.openai.com/api/docs/guides/secure-mcp-tunnels',
    tunnelSettings: 'https://platform.openai.com/settings/organization/tunnels',
    dots: 'https://help.openai.com/en/articles/20001530-getting-started-with-your-dot',
  }
  const link = (key, url) => h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, t(key))
  return h('section', { className: 'dotsMcpSettings', 'data-testid': 'dots-mcp-settings' },
    h('h3', null, t('mcpTitle')), h('p', null, t('mcpDescription')),
    h('label', { className: 'dotsMcpSwitch' }, h('input', { type: 'checkbox', role: 'switch', 'aria-label': t('mcpEnable'),
      checked: status?.enabled === true, disabled: busy || !status,
      onChange: event => { void act('configure', { enabled: event.target.checked }) } }), t('mcpEnable')),
    h('p', { 'data-testid': 'dots-mcp-state' }, !status ? t('mcpLoading') : status.running ? t('mcpRunning') : status.error ? t('mcpError') : t('mcpOff')),
    h('div', { className: 'dotsMcpField' }, h('label', { htmlFor: 'dots-mcp-port' }, t('mcpPort')),
      h('input', { id: 'dots-mcp-port', type: 'number', min: 0, max: 65535, value: port, disabled: busy,
        onChange: e => setPort(e.target.value) })),
    h('div', { className: 'dotsMcpField' }, h('label', { htmlFor: 'dots-mcp-origin' }, t('mcpPublic')),
      h('input', { id: 'dots-mcp-origin', type: 'url', value: origin, disabled: busy, placeholder: 'https://example.com',
        onChange: e => setOrigin(e.target.value) })),
    h('div', { className: 'dotsMcpRow' },
      button('mcpSave', () => { void act('configure', { port: Number(port), publicOrigin: origin }) }),
      button('mcpRefresh', () => { void act('status') }),
      button(checking ? 'mcpChecking' : 'mcpCheck', () => { void check() }, !status?.running || checking)),
    connection('mcpLocalUrl', status?.localUrl), connection('mcpPublicUrl', status?.publicUrl),
    status?.running ? h('div', null, h('p', { className: 'dotsMcpHint' }, t('mcpSecret')),
      h('div', { className: 'dotsMcpRow' }, button(reveal ? 'mcpHide' : 'mcpReveal', () => setReveal(v => !v)),
        button('mcpRotate', () => { void act('rotate') }))) : null,
    status?.lastCheck?.ok ? h('p', null, `${t('mcpLocalPassed')} · ${status.lastCheck.toolCount} · ${status.lastCheck.at}`) : null,
    h('p', { className: 'dotsMcpHint' }, t('mcpLocalOnly')),
    h('p', { 'data-testid': 'dots-mcp-last-call' }, status?.lastCall
      ? `${t('mcpLastCall')}: ${status.lastCall.tool} · ${t(status.lastCall.ok ? 'mcpSuccess' : 'mcpFailure')} · ${status.lastCall.at}` : t('mcpNoCall')),
    status?.lastCall?.error ? h('p', { role: 'alert' }, status.lastCall.error) : null,
    (message || status?.error) ? h('p', { role: 'status' }, message || status.error) : null,
    h('h4', null, t('mcpGuide')),
    ...['mcpStep1', 'mcpStep2', 'mcpStep3', 'mcpStep4', 'mcpStep5'].map(key => h('p', { key }, t(key))),
    h('p', { className: 'dotsMcpHint' }, t('mcpOffHelp')),
    h('div', { className: 'dotsMcpLinks' }, link('mcpRegistration', t('mcpOff') === zh.mcpOff ? guides.registrationZh : guides.registration),
      link('mcpTunnel', guides.tunnel), link('mcpTunnelSettings', guides.tunnelSettings), link('mcpDotGuide', guides.dots)),
    h('details', null, h('summary', null, `${t('mcpTools')} (${status?.tools?.length ?? 0})`),
      ...(status?.tools ?? []).map(tool => h('p', { key: tool.name }, h('code', null, tool.name), ' — ', tool.description))))
}
exports.DotsMcpSettings = DotsMcpSettings
