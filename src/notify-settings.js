/** Independent opt-in notification controls for exactly selected native DSH sessions. */
Object.assign(zh, {
  notifyTitle: '主动通知 Dot', notifyEnable: '允许主动通知',
  notifyDescription: '仅通知你指定的会话和事件，默认关闭。',
  notifySessions: '会话 ID' , notifyScope: '通知事件', notifyDetails: '订阅说明',
  notifySessionsHint: '每行填写一个 Session ID，可从 DSH 会话列表取得。留空则不发送通知。',
  notifyTurn: '会话轮次结束', notifyError: '会话执行错误',
  notifySave: '保存通知范围', notifyStateOff: '主动通知已关闭',
  notifyStateOn: '通知已开启，等待 Dot 创建订阅',
  notifyStateActive: '已启用所选会话的通知',
  notifyMcpOff: 'MCP 未运行；通知会在连接开启后生效。',
  notifyNoScope: '请指定会话与事件类型，再由 Dot 在官方 MCP Events 中订阅。',
  notifySubscribed: '当前有效订阅数量', notifyLast: '最近一次投递',
  notifyVerified: '投递已被接收', notifyFailed: '投递失败',
  notifyHelp: '仅用户选择的会话和事件在 Dot 主动订阅后才会投递。关闭开关会撤销已有通知订阅。更换 MCP 连接密钥也会撤销旧订阅。',
  notifyOfficial: 'OpenAI MCP Events 官方指南',
})
Object.assign(en, {
  notifyTitle: 'Proactive notifications to Dot (optional)', notifyEnable: 'Enable proactive notifications',
  notifyDescription: 'Choose which sessions and events can notify Dot. Off by default.',
  notifySessions: 'Session IDs', notifyScope: 'Event types', notifyDetails: 'About subscriptions',
  notifySessionsHint: 'Copy Session IDs from the DSH session list. No sessions selected means no notifications.',
  notifyTurn: 'Session turn ended', notifyError: 'Session execution error',
  notifySave: 'Save notification scope', notifyStateOff: 'Notifications are off',
  notifyStateOn: 'Enabled; waiting for a Dot subscription',
  notifyStateActive: 'Notifications enabled for selected sessions',
  notifyMcpOff: 'The MCP connection is not running. Notifications become available when it starts.',
  notifyNoScope: 'Select sessions and event types, then subscribe through official MCP Events in Dot.',
  notifySubscribed: 'Active subscriptions', notifyLast: 'Most recent delivery',
  notifyVerified: 'Accepted', notifyFailed: 'Delivery failed',
  notifyHelp: 'Events are sent only after you choose an exact session and event and Dot subscribes. Turning this off clears subscriptions. Rotating the MCP connection key also revokes old subscriptions.',
  notifyOfficial: 'OpenAI MCP Events guide',
})
function DotsNotifySettings({ t, notifyRpc, mcpRunning }) {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [sessions, setSessions] = useState('')
  const [types, setTypes] = useState([])
  const alive = useRef(true)
  const update = next => {
    if (!alive.current) return
    setStatus(next)
    setSessions((next.sessions ?? []).join('\n'))
    setTypes(next.types ?? [])
  }
  useEffect(() => {
    alive.current = true
    const abort = new AbortController()
    notifyRpc('status', {}, abort.signal).then(update).catch(cause => {
      if (!abort.signal.aborted && alive.current) setMessage(String(cause.message || cause))
    })
    return () => { alive.current = false; abort.abort() }
  }, [])
  const selection = () => ({
    sessions: [...new Set(sessions.split(/[\n,]+/).map(value => value.trim()).filter(Boolean))],
    types,
  })
  const apply = async changes => {
    if (busy) return
    setBusy(true); setMessage('')
    try { update(await notifyRpc('configure', { ...selection(), ...changes })) }
    catch (cause) {
      if (alive.current) setMessage(String(cause.message || cause))
      try { update(await notifyRpc('status')) } catch {}
    } finally { if (alive.current) setBusy(false) }
  }
  const checked = (name, label) => h('label', { className: 'dotsMcpSwitch' },
    h('input', { type: 'checkbox', checked: types.includes(name), disabled: busy,
      onChange: event => setTypes(old => event.target.checked ? [...new Set([...old, name])] : old.filter(value => value !== name)) }),
    h('span', null, t(label)))
  return h('section', { className: 'dotsTunnelSettings dotsSettingsCard', 'data-testid': 'dots-notify-settings' },
    h('div', { className: 'dotsCardHeader' }, h('h4', null, t('notifyTitle')),
      h('p', { className: 'dotsStatus', 'data-active': status?.enabled === true, 'data-testid': 'dots-notify-state' },
        !status || !status.enabled ? t('notifyStateOff')
          : status.subscriptionCount > 0 && status.active ? t('notifyStateActive') : t('notifyStateOn'))),
    h('p', { className: 'dotsCardIntro' }, t('notifyDescription')),
    h('label', { className: 'dotsMcpSwitch' },
      h('input', { type: 'checkbox', role: 'switch', 'aria-label': t('notifyEnable'),
        disabled: busy || !status, checked: status?.enabled === true,
        onChange: event => { void apply({ enabled: event.target.checked }) } }), h('span', null, t('notifyEnable'))),
    h('label', { className: 'dotsMcpField' }, h('span', { className: 'dotsFieldLabel' }, t('notifySessions')),
      h('textarea', { value: sessions, disabled: busy, rows: 3, spellCheck: false,
        placeholder: 'session_…', onInput: event => setSessions(event.currentTarget.value) })),
    h('p', { className: 'dotsMcpHint' }, t('notifySessionsHint')),
    h('p', { className: 'dotsSectionTitle' }, t('notifyScope')),
    h('div', { className: 'dotsChoices' }, checked('dsh.session.turn-ended', 'notifyTurn'), checked('dsh.session.error', 'notifyError')),
    h('div', { className: 'dotsMcpRow dotsActions' },
      h('button', { type: 'button', className: 'dotsMcpButton dotsPrimaryButton', disabled: busy || !status,
        onClick: () => { void apply({}) } }, t('notifySave')),
      h('a', { href: 'https://developers.openai.com/plugins/build/mcp-events', target: '_blank', rel: 'noopener noreferrer' }, t('notifyOfficial'))),
    status?.enabled && (!status.sessions?.length || !status.types?.length) ? h('p', { className: 'dotsMcpHint' }, t('notifyNoScope')) : null,
    status?.enabled && !mcpRunning ? h('p', { className: 'dotsMcpHint' }, t('notifyMcpOff')) : null,
    status ? h('div', { className: 'dotsMetrics' }, h('span', null, t('notifySubscribed') + ': ', h('strong', null, status.subscriptionCount))) : null,
    status?.lastDelivery ? h('p', { className: 'dotsMcpHint' }, t('notifyLast') + ': ' + status.lastDelivery.name + ' · ' +
      t(status.lastDelivery.ok ? 'notifyVerified' : 'notifyFailed') + ' · ' + status.lastDelivery.at) : null,
    message || status?.error ? h('p', { className: 'dotsMessage', role: 'status' }, message || status.error) : null,
    h('details', { className: 'dotsDetails' }, h('summary', null, t('notifyDetails')),
      h('p', { className: 'dotsMcpHint' }, t('notifyHelp'))))
}
exports.DotsNotifySettings = DotsNotifySettings
