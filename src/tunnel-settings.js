/** Native Dots settings for the unmodified OpenAI tunnel-client. */
Object.assign(zh, {
  tunnelTitle: 'OpenAI Secure MCP Tunnel', tunnelClientGroup: '客户端', tunnelConnectionGroup: '连接配置', tunnelInstallDir: '客户端安装目录', tunnelPick: '选择目录',
  tunnelExecutable: '已有客户端路径（可选）', tunnelId: 'Tunnel ID', tunnelKey: 'Runtime API Key',
  tunnelKeyHint: '密钥仅保留在本次 DSH 运行中，由环境变量交给官方客户端；重启 DSH 后重新填写。',
  tunnelKeySaved: '本次运行已有密钥；留空沿用', tunnelInstall: '下载并安装官方客户端', tunnelInstallHint: '每次点击均从 OpenAI 官方 GitHub 获取最新发行版；只保留当前客户端和一份上一版。', tunnelSave: '保存位置和 Tunnel ID',
  tunnelStart: '启动隧道', tunnelStop: '停止 / 取消', tunnelRefresh: '刷新隧道状态', tunnelDoctor: '检查配置',
  tunnelInstalled: '客户端已就绪', tunnelMissing: '尚未选择客户端', tunnelRunning: '客户端运行中',
  tunnelPendingSwitch: '新客户端已下载，当前仍在运行旧客户端。点击“启动隧道”切换。',
  tunnelConnected: '官方客户端报告连接就绪', tunnelNotReady: '连接尚未就绪；查看下方诊断',
  tunnelStopped: '隧道已停止', tunnelBusy: '正在处理', tunnelReport: '诊断结果',
  tunnelNoHealth: '客户端已启动；点击“刷新隧道状态”读取官方健康检查。',
  tunnelPlatform: '打开 Tunnel 创建页面', tunnelKeys: '打开 Runtime API Key 页面', tunnelDownload: '官方客户端下载页',
  tunnelHint: '本地 MCP 地址自动使用当前 Dots 服务。停止隧道或关闭 MCP 都不取消已提交的 DSH 任务。',
  tunnelMcpOff: '可先安装客户端；启动隧道前请打开上方 MCP 开关。',
  tunnelExisting: '已经下载的客户端也可直接填写可执行文件完整路径。安装目录随当前 DSH 配置保存。',
})
Object.assign(en, {
  tunnelTitle: 'OpenAI Secure MCP Tunnel', tunnelClientGroup: 'Client', tunnelConnectionGroup: 'Connection', tunnelInstallDir: 'Client installation directory', tunnelPick: 'Choose directory',
  tunnelExecutable: 'Existing client executable (optional)', tunnelId: 'Tunnel ID', tunnelKey: 'Runtime API Key',
  tunnelKeyHint: 'The key stays in memory for this DSH run and is passed to the official client through its environment. Enter it again after restarting DSH.',
  tunnelKeySaved: 'A runtime key is available; leave blank to reuse it', tunnelInstall: 'Download and install official client', tunnelInstallHint: 'Every download checks the latest official GitHub release. Keep the current client and one previous version.', tunnelSave: 'Save location and Tunnel ID',
  tunnelStart: 'Start tunnel', tunnelStop: 'Stop / cancel', tunnelRefresh: 'Refresh tunnel status', tunnelDoctor: 'Check configuration',
  tunnelInstalled: 'Client available', tunnelMissing: 'No client selected', tunnelRunning: 'Client running',
  tunnelPendingSwitch: 'New client downloaded; the previous client is still running. Select Start tunnel to switch.',
  tunnelConnected: 'Official client reports ready', tunnelNotReady: 'Connection not ready; see diagnostics below',
  tunnelStopped: 'Tunnel stopped', tunnelBusy: 'Working', tunnelReport: 'Diagnostic result',
  tunnelNoHealth: 'The client has started. Refresh tunnel status to read its official health report.',
  tunnelPlatform: 'Open Tunnel settings', tunnelKeys: 'Open Runtime API Keys', tunnelDownload: 'Official client downloads',
  tunnelHint: 'The target is the current Dots MCP URL. Stopping the tunnel or MCP does not cancel accepted DSH tasks.',
  tunnelMcpOff: 'You can install the client first. Enable MCP above before starting the tunnel.',
  tunnelExisting: 'You can also enter the full path of an existing executable. The installation location is saved for this DSH profile.',
})
function DotsTunnelSettings({ t, tunnelRpc, mcpRunning }) {
  const [status, setStatus] = useState(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [directory, setDirectory] = useState(''), [executable, setExecutable] = useState(''), [id, setId] = useState(''), [key, setKey] = useState('')
  const alive = useRef(true), active = useRef(null)
  const update = value => {
    if (!alive.current) return
    setStatus(value); setDirectory(value.installDirectory ?? ''); setExecutable(value.executable ?? ''); setId(value.tunnelId ?? '')
  }
  useEffect(() => {
    alive.current = true
    const abort = new AbortController()
    tunnelRpc('status', {}, abort.signal).then(update).catch(error => { if (!abort.signal.aborted) setMessage(String(error.message || error)) })
    return () => { alive.current = false; abort.abort() }
  }, [mcpRunning])
  const act = async (name, fields = false) => {
    const mine = Symbol(name); active.current = mine
    setBusy(true); setMessage('')
    try {
      const value = await tunnelRpc(name, fields ? { installDirectory: directory, executable, tunnelId: id, ...(key ? { apiKey: key } : {}) } : {})
      if (active.current !== mine) return
      update(value)
      if (fields && alive.current) setKey('')
    } catch (error) {
      if (active.current !== mine) return
      if (alive.current) setMessage(String(error.message || error))
      try { update(await tunnelRpc('status')) } catch {}
    } finally { if (alive.current && active.current === mine) { active.current = null; setBusy(false) } }
  }
  const choose = async () => {
    try { const value = await window.__DSH_DIRECTORY_PICKER__.pick(); if (value && alive.current) setDirectory(value) }
    catch (error) { if (alive.current) setMessage(String(error.message || error)) }
  }
  const field = (label, value, set, props = {}) => h('label', { className: 'dotsMcpField' }, h('span', { className: 'dotsFieldLabel' }, t(label)),
    h('input', { value, type: 'text', disabled: busy, spellCheck: false, onChange: event => set(event.target.value), ...props }))
  const button = (label, action, fields, disabled = false) => h('button', { type: 'button', className: 'dotsMcpButton' + (['install', 'start'].includes(action) ? ' dotsPrimaryButton' : ''),
    disabled: action === 'stop' ? false : busy || disabled, onClick: () => { void act(action, fields) } }, t(label))
  const official = status?.links ?? {
    settings: 'https://platform.openai.com/settings/organization/tunnels', keys: 'https://platform.openai.com/settings/organization/api-keys',
    download: 'https://github.com/openai/tunnel-client/releases/latest',
  }
  return h('section', { className: 'dotsTunnelSettings dotsSettingsCard', 'data-testid': 'dots-tunnel-settings' },
    h('div', { className: 'dotsCardHeader' }, h('h4', null, t('tunnelTitle')),
      h('p', { className: 'dotsStatus', 'data-active': status?.running === true, 'data-testid': 'dots-tunnel-state' },
        busy ? t('tunnelBusy') : status?.running ? t('tunnelRunning') : t('tunnelStopped'))),
    h('p', { className: 'dotsCardIntro' }, t('tunnelHint')),
    h('div', { className: 'dotsMcpLinks' },
      ...[['tunnelPlatform', official.settings], ['tunnelKeys', official.keys], ['tunnelDownload', official.download]]
        .map(([label, href]) => h('a', { key: label, href, target: '_blank', rel: 'noopener noreferrer' }, t(label)))),
    h('p', { className: 'dotsSectionTitle' }, t('tunnelClientGroup')),
    h('div', { className: 'dotsMcpField' }, h('label', { htmlFor: 'dots-tunnel-directory' }, t('tunnelInstallDir')),
      h('div', { className: 'dotsFieldRow' },
        h('input', { id: 'dots-tunnel-directory', type: 'text', value: directory, disabled: busy, spellCheck: false,
          onChange: event => setDirectory(event.target.value) }),
        typeof window === 'object' && typeof window.__DSH_DIRECTORY_PICKER__?.pick === 'function'
          ? h('button', { type: 'button', className: 'dotsMcpButton', disabled: busy, onClick: () => { void choose() } }, t('tunnelPick')) : null)),
    h('details', { className: 'dotsDetails' }, h('summary', null, t('tunnelExecutable')),
      field('tunnelExecutable', executable, setExecutable), h('p', { className: 'dotsMcpHint' }, t('tunnelExisting'))),
    h('div', { className: 'dotsMcpRow dotsActions' }, button('tunnelInstall', 'install', true),
      h('p', { className: 'dotsStatus', 'data-testid': 'dots-tunnel-installed' }, status?.installed ? t('tunnelInstalled') : t('tunnelMissing'))),
    h('p', { className: 'dotsMcpHint' }, t('tunnelInstallHint')),
    h('hr', { className: 'dotsDivider' }),
    h('p', { className: 'dotsSectionTitle' }, t('tunnelConnectionGroup')),
    field('tunnelId', id, setId, { placeholder: 'tunnel_…' }),
    field('tunnelKey', key, setKey, { type: 'password', autoComplete: 'off', placeholder: status?.keyAvailable ? t('tunnelKeySaved') : 'Runtime API Key' }),
    h('p', { className: 'dotsMcpHint' }, t('tunnelKeyHint')),
    h('div', { className: 'dotsMcpRow dotsActions' },
      button('tunnelStart', 'start', true, !mcpRunning), button('tunnelStop', 'stop', false), button('tunnelSave', 'configure', true)),
    h('div', { className: 'dotsMcpRow dotsActions' }, button('tunnelDoctor', 'diagnose', true, !mcpRunning), button('tunnelRefresh', 'refresh', false)),
    !mcpRunning ? h('p', { className: 'dotsMcpHint' }, t('tunnelMcpOff')) : null,
    status?.pendingClientSwitch ? h('p', { className: 'dotsMessage', role: 'status' }, t('tunnelPendingSwitch')) : null,
    status?.running ? h('p', { className: 'dotsMcpHint' }, status.health ? t(status.health.ok ? 'tunnelConnected' : 'tunnelNotReady') : t('tunnelNoHealth')) : null,
    (message || status?.error) ? h('p', { className: 'dotsMessage', role: 'status' }, message || status.error) : null,
    status?.lastDiagnosis || status?.health ? h('details', { className: 'dotsDetails' }, h('summary', null, t('tunnelReport')),
      h('pre', { className: 'dotsReport' }, JSON.stringify(status.health ?? status.lastDiagnosis, null, 2))) : null)
}
exports.DotsTunnelSettings = DotsTunnelSettings
