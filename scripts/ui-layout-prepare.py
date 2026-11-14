"""One-shot source editor for the verified Settings candidate; removed after acceptance."""
from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
def change(text, old, new):
    if text.count(old)!=1: raise RuntimeError('Expected one source anchor: '+old[:100])
    return text.replace(old,new)
def render(text, marker, end, replacement):
    a=text.index(marker); b=text.index(end,a)
    return text[:a]+replacement+text[b:]
p=r/'src/styles.css'; css=p.read_text(); css=css[:css.index('/* Dots settings use')]
css+='''/* Settings-only design system. DSH owns the theme; controls retain native semantics. */
.dotsSettings {
  --dots-accent: var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4d6bfe);
  --dots-stroke: var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l3, #d9dde5));
  --dots-muted: var(--dsw-alias-label-secondary, #626b7a);
  box-sizing: border-box; width: 100%; min-width: 0; padding: 4px 0 16px;
  font-family: inherit; font-size: 13px; font-weight: 400; line-height: 1.6;
  color: var(--dsw-alias-label-primary, inherit);
}
.dotsSettings *, .dotsSettings *::before, .dotsSettings *::after { box-sizing: border-box; }
.dotsMcpSettings { display: flex; flex-direction: column; gap: 16px; min-width: 0; padding: 0; }
.dotsSettings .dotsSettingsCard {
  width: 100%; min-width: 0; padding: 18px 20px; margin: 0;
  border: 1px solid var(--dots-stroke); border-radius: 12px;
  background: var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-2, transparent));
}
.dotsSettings > .dotsSettingsCard { margin-bottom: 16px; }
.dotsSettings h3, .dotsSettings h4, .dotsSettings p { margin: 0; overflow-wrap: anywhere; }
.dotsSettings h3, .dotsSettings h4 { font: inherit; font-size: 14px; line-height: 22px; font-weight: 650; }
.dotsSettings .dotsCardHeader { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 12px; margin-bottom: 6px; }
.dotsSettings .dotsCardIntro { color: var(--dots-muted); font-size: 12px; line-height: 19px; margin-bottom: 16px; }
.dotsSettings .dotsMcpHint { color: var(--dots-muted); font-size: 12px; line-height: 19px; opacity: 1; margin-top: 6px; }
.dotsSettings .dotsMcpRow { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; }
.dotsSettings .dotsFieldRow { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dotsSettings .dotsFieldRow > input { flex: 1 1 0; width: 0; min-width: 0; }
.dotsSettings .dotsFieldRow > button { flex: 0 0 auto; }
.dotsSettings .dotsMcpField { display: flex; flex-direction: column; gap: 6px; min-width: 0; margin: 14px 0 0; font-size: 13px; line-height: 20px; }
.dotsSettings .dotsMcpField > label, .dotsSettings .dotsFieldLabel { font-weight: 500; }
/* Text inputs and checkboxes have deliberately separate sizing rules. */
.dotsSettings input:not([type=checkbox]):not([type=radio]), .dotsSettings textarea {
  display: block; width: 100%; min-width: 0; min-height: 34px; margin: 0; padding: 7px 10px;
  border: 1px solid var(--dsw-alias-border-l3, #d9dde5); border-radius: 7px;
  background: var(--dsw-alias-bg-layer-2, transparent); color: var(--dsw-alias-label-primary, inherit);
  font: inherit; font-size: 13px; line-height: 20px; box-shadow: none;
}
.dotsSettings .dotsFieldRow > input:not([type=checkbox]) { width: 0; }
.dotsSettings textarea { min-height: 84px; resize: vertical; }
.dotsSettings input::placeholder, .dotsSettings textarea::placeholder { color: var(--dsw-alias-label-tertiary, #818996); opacity: 1; }
.dotsSettings input:focus-visible, .dotsSettings textarea:focus-visible, .dotsSettings button:focus-visible, .dotsSettings summary:focus-visible, .dotsSettings a:focus-visible {
  outline: 2px solid var(--dots-accent); outline-offset: 2px;
}
.dotsSettings .dotsMcpSwitch {
  display: inline-flex; align-items: center; flex-wrap: nowrap; gap: 9px; min-height: 28px; width: auto; margin: 0;
  font-size: 13px; line-height: 20px; cursor: pointer;
}
.dotsSettings input[type=checkbox], .dotsSettings input[type=radio] {
  flex: 0 0 16px; width: 16px; height: 16px; min-width: 16px; min-height: 16px; margin: 0; padding: 0;
  accent-color: var(--dots-accent); cursor: pointer;
}
.dotsSettings .dotsMcpSwitch > span { min-width: 0; }
.dotsSettings .dotsSwitchRow { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 8px 0 12px; }
.dotsSettings .dotsChoices { display: flex; flex-wrap: wrap; gap: 8px 22px; padding: 8px 0 0; }
.dotsSettings .dotsMcpButton {
  appearance: none; display: inline-flex; align-items: center; justify-content: center; min-height: 34px;
  margin: 0; padding: 6px 12px; border: 1px solid var(--dsw-alias-border-l3, #d9dde5); border-radius: 7px;
  background: var(--dsw-alias-bg-layer-2, transparent); color: inherit; font: inherit; font-size: 12px; line-height: 20px;
  cursor: pointer; text-align: center; white-space: normal; overflow-wrap: anywhere;
}
.dotsSettings .dotsMcpButton:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #7f7f7f10); }
.dotsSettings .dotsPrimaryButton { border-color: var(--dots-accent); color: var(--dots-accent); background: color-mix(in srgb, var(--dots-accent) 7%, transparent); font-weight: 600; }
.dotsSettings .dotsMcpButton:disabled, .dotsSettings input:disabled, .dotsSettings textarea:disabled { opacity: .5; cursor: default; }
.dotsSettings .dotsActions { margin-top: 14px; }
.dotsSettings .dotsMcpLinks { display: flex; flex-direction: row; align-items: center; flex-wrap: wrap; gap: 6px 14px; margin: 10px 0; }
.dotsSettings a { color: var(--dots-accent); font-size: 12px; line-height: 20px; text-decoration: none; overflow-wrap: anywhere; }
.dotsSettings a:hover { text-decoration: underline; text-underline-offset: 3px; }
.dotsSettings .dotsStatus { display: inline-flex; align-items: center; gap: 6px; min-width: 0; max-width: 100%; padding: 2px 8px; border-radius: 5px; font-size: 11px; line-height: 19px; color: var(--dots-muted); background: var(--dsw-alias-bg-hover, #7f7f7f0d); }
.dotsSettings .dotsStatus[data-active=true] { color: var(--dsw-alias-state-success-primary, #168154); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #168154) 8%, transparent); }
.dotsSettings .dotsStatus::before { content: ''; flex: none; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.dotsSettings .dotsSectionTitle { margin-top: 16px; font-size: 12px; line-height: 20px; font-weight: 600; color: var(--dots-muted); }
.dotsSettings .dotsDivider { height: 0; margin: 18px 0; border: 0; border-top: 1px solid var(--dots-stroke); }
.dotsSettings .dotsDetails { margin-top: 14px; border-top: 1px solid var(--dots-stroke); padding-top: 12px; }
.dotsSettings .dotsDetails summary { cursor: pointer; font-size: 12px; line-height: 22px; font-weight: 500; color: var(--dots-muted); }
.dotsSettings .dotsDetails[open] summary { margin-bottom: 10px; }
.dotsSettings .dotsDetails p + p { margin-top: 8px; }
.dotsSettings .dotsMessage { padding: 8px 10px; margin-top: 10px; border-radius: 7px; background: var(--dsw-alias-interactive-bg-hover, #7f7f7f0d); font-size: 12px; line-height: 20px; }
.dotsSettings .dotsReport { font: 11px/18px ui-monospace, SFMono-Regular, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; max-width: 100%; margin: 0; }
.dotsSettings .dotsMetrics { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin-top: 14px; font-size: 12px; color: var(--dots-muted); }
.dotsSettings .dotsMetrics strong { font-weight: 600; color: var(--dsw-alias-label-primary, inherit); }
.dotsSettings .dotsToolList { display: grid; gap: 10px; }
.dotsSettings .dotsToolList p { font-size: 12px; }
.dotsSettings .dotsToolList code { font-size: 11px; overflow-wrap: anywhere; }
@media (max-width: 560px) {
  .dotsSettings .dotsSettingsCard { padding: 14px; }
  .dotsSettings .dotsChoices { gap: 8px 16px; }
  .dotsSettings .dotsFieldRow { flex-wrap: wrap; }
  .dotsSettings .dotsFieldRow > input:not([type=checkbox]) { min-width: 140px; }
}
'''
p.write_text(css)
p=r/'src/notify-settings.js';s=p.read_text()
for a,b in [
("notifyTitle: '主动通知 Dot（可选）'","notifyTitle: '主动通知 Dot'"),
("notifyDescription: '独立开关，默认关闭。只允许下方指定会话及事件类型；其他 DSH 工作不会被推送。'","notifyDescription: '仅通知你指定的会话和事件，默认关闭。'"),
("notifyDescription: 'Independent switch, off by default. Only the exact sessions and event types selected below can notify Dot.'","notifyDescription: 'Choose which sessions and events can notify Dot. Off by default.'"),
("notifySessions: '允许通知的会话 ID（每行一个）'","notifySessions: '会话 ID' , notifyScope: '通知事件', notifyDetails: '订阅说明'"),
("notifySessions: 'Allowed Session IDs (one per line)'","notifySessions: 'Session IDs', notifyScope: 'Event types', notifyDetails: 'About subscriptions'"),
("notifySessionsHint: '从 DSH 会话列表取得 Session ID。未指定会话时，不发送任何通知。'","notifySessionsHint: '每行填写一个 Session ID，可从 DSH 会话列表取得。留空则不发送通知。'"),
("t(label))\n  return h","h('span', null, t(label)))\n  return h")]:s=change(s,a,b)
s=render(s,"  return h('section', { className: 'dotsTunnelSettings'",'\n}\nexports.DotsNotifySettings','''  return h('section', { className: 'dotsTunnelSettings dotsSettingsCard', 'data-testid': 'dots-notify-settings' },
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
      h('p', { className: 'dotsMcpHint' }, t('notifyHelp'))))''')
p.write_text(s)
p=r/'src/tunnel-settings.js';s=p.read_text()
s=s.replace("tunnelTitle: 'OpenAI Secure MCP Tunnel'","tunnelTitle: 'OpenAI Secure MCP Tunnel', tunnelClientGroup: '客户端', tunnelConnectionGroup: '连接配置'",1)
pos=s.index('Object.assign(en');s=s[:pos]+s[pos:].replace("tunnelTitle: 'OpenAI Secure MCP Tunnel'","tunnelTitle: 'OpenAI Secure MCP Tunnel', tunnelClientGroup: 'Client', tunnelConnectionGroup: 'Connection'",1)
s=change(s,"h('label', { className: 'dotsMcpField' }, t(label),","h('label', { className: 'dotsMcpField' }, h('span', { className: 'dotsFieldLabel' }, t(label)),")
s=change(s,"className: 'dotsMcpButton',\n    disabled: action","className: 'dotsMcpButton' + (['install', 'start'].includes(action) ? ' dotsPrimaryButton' : ''),\n    disabled: action")
s=render(s,"  return h('section', { className: 'dotsTunnelSettings'",'\n}\nexports.DotsTunnelSettings','''  return h('section', { className: 'dotsTunnelSettings dotsSettingsCard', 'data-testid': 'dots-tunnel-settings' },
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
      h('pre', { className: 'dotsReport' }, JSON.stringify(status.health ?? status.lastDiagnosis, null, 2))) : null)''')
p.write_text(s)
p=r/'src/mcp-settings.js';s=p.read_text()
s=change(s,"mcpTitle: 'MCP · 让 Dot 操作 DSH'","mcpTitle: 'MCP 连接 · 让 Dot 操作 DSH'")
s=change(s,"className: 'dotsMcpRow' },\n      h('input'","className: 'dotsFieldRow' },\n      h('input'")
s=render(s,"  return h('section', { className: 'dotsMcpSettings'",'\n}\nexports.DotsMcpSettings','''  return h('section', { className: 'dotsMcpSettings', 'data-testid': 'dots-mcp-settings' },
    h('div', { className: 'dotsSettingsCard' },
      h('div', { className: 'dotsCardHeader' }, h('h3', null, t('mcpTitle')),
        h('p', { className: 'dotsStatus', 'data-active': status?.running === true, 'data-testid': 'dots-mcp-state' },
          !status ? t('mcpLoading') : status.running ? t('mcpRunning') : !status.enabled ? t('mcpOff') : status.error ? t('mcpError') : t('mcpOff'))),
      h('p', { className: 'dotsCardIntro' }, t('mcpDescription')),
      h('label', { className: 'dotsMcpSwitch' }, h('input', { type: 'checkbox', role: 'switch', 'aria-label': t('mcpEnable'),
        checked: status?.enabled === true, disabled: busy || !status,
        onChange: event => { void act('configure', { enabled: event.target.checked }) } }), h('span', null, t('mcpEnable'))),
      h('div', { className: 'dotsMcpField' }, h('label', { htmlFor: 'dots-mcp-port' }, t('mcpPort')),
        h('input', { id: 'dots-mcp-port', type: 'number', min: 0, max: 65535, value: port, disabled: busy,
          onChange: e => setPort(e.target.value) })),
      h('div', { className: 'dotsMcpField' }, h('label', { htmlFor: 'dots-mcp-origin' }, t('mcpPublic')),
        h('input', { id: 'dots-mcp-origin', type: 'url', value: origin, disabled: busy, placeholder: 'https://example.com',
          onChange: e => setOrigin(e.target.value) })),
      h('div', { className: 'dotsMcpRow dotsActions' },
        button('mcpSave', () => { void act('configure', { port: Number(port), publicOrigin: origin }) }),
        button('mcpRefresh', () => { void act('status') }),
        button(checking ? 'mcpChecking' : 'mcpCheck', () => { void check() }, !status?.running || checking)),
      connection('mcpLocalUrl', status?.localUrl), connection('mcpPublicUrl', status?.publicUrl),
      status?.running ? h('div', null, h('p', { className: 'dotsMcpHint' }, t('mcpSecret')),
        h('div', { className: 'dotsMcpRow dotsActions' }, button(reveal ? 'mcpHide' : 'mcpReveal', () => setReveal(v => !v)),
          button('mcpRotate', () => { void act('rotate') }))) : null,
      status?.lastCheck?.ok ? h('p', { className: 'dotsMcpHint' }, `${t('mcpLocalPassed')} · ${status.lastCheck.toolCount} · ${status.lastCheck.at}`) : null,
      h('p', { className: 'dotsMcpHint' }, t('mcpLocalOnly')),
      h('p', { className: 'dotsMcpHint', 'data-testid': 'dots-mcp-last-call' }, status?.lastCall
        ? `${t('mcpLastCall')}: ${status.lastCall.tool} · ${t(status.lastCall.ok ? 'mcpSuccess' : 'mcpFailure')} · ${status.lastCall.at}` : t('mcpNoCall')),
      status?.lastCall?.error ? h('p', { className: 'dotsMessage', role: 'alert' }, status.lastCall.error) : null,
      (message || status?.error) ? h('p', { className: 'dotsMessage', role: 'status' }, message || status.error) : null,
      h('details', { className: 'dotsDetails' }, h('summary', null, t('mcpGuide')),
        ...['mcpStep1', 'mcpStep2', 'mcpStep3', 'mcpStep4', 'mcpStep5'].map(key => h('p', { key, className: 'dotsMcpHint' }, t(key))),
        h('p', { className: 'dotsMcpHint' }, t('mcpOffHelp')),
        h('div', { className: 'dotsMcpLinks' }, link('mcpRegistration', t('mcpOff') === zh.mcpOff ? guides.registrationZh : guides.registration),
          link('mcpTunnel', guides.tunnel), link('mcpTunnelSettings', guides.tunnelSettings), link('mcpDotGuide', guides.dots)))),
    tunnelRpc ? h(DotsTunnelSettings, { t, tunnelRpc, mcpRunning: status?.running === true }) : null,
    notifyRpc ? h(DotsNotifySettings, { t, notifyRpc, mcpRunning: status?.running === true }) : null,
    h('details', { className: 'dotsDetails dotsSettingsCard' }, h('summary', null, `${t('mcpTools')} (${status?.tools?.length ?? 0})`),
      h('div', { className: 'dotsToolList' },
        ...(status?.tools ?? []).map(tool => h('p', { key: tool.name }, h('code', null, tool.name), ' — ', tool.description)))))''')
p.write_text(s)
p=r/'src/client.js';s=p.read_text()
s=change(s,"""type: 'button', disabled: busy || !enabled, onClick: action,
    style: { border: '1px solid var(--dsw-alias-border-l3, #8886)', borderRadius: 7,
      padding: '8px 12px', background: 'transparent', color: 'inherit', cursor: 'pointer' },""","""type: 'button', className: 'dotsMcpButton', disabled: busy || !enabled, onClick: action,""")
for a,b in [
("{ 'data-testid': 'dots-persistence-settings', style: { padding: 16, maxWidth: 760 } }","{ 'data-testid': 'dots-persistence-settings', className: 'dotsSettingsCard' }"),
("h('h3', { style: { marginTop: 0 } }, t('persistenceTitle'))","h('div', { className: 'dotsCardHeader' }, h('h3', null, t('persistenceTitle')))"),
("h('p', null, t('persistenceDescription'))","h('p', { className: 'dotsCardIntro' }, t('persistenceDescription'))"),
("h('p', { 'data-testid': 'dots-persistence-status' }, summary)","h('p', { className: 'dotsStatus', 'data-testid': 'dots-persistence-status' }, summary)"),
("{ style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } }","{ className: 'dotsMcpRow dotsActions' }")]:s=change(s,a,b)
p.write_text(s)
for f in ['package.json','package-lock.json']:
    p=r/f; data=json.loads(p.read_text()); assert data['version']=='2.0.1-test.7'; data['version']='2.0.1-test.8'
    if f=='package-lock.json': data['packages']['']['version']='2.0.1-test.8'
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
for f in ['src/mcp-server.mjs','src/mcp-adapter.mjs']:
    p=r/f; p.write_text(change(p.read_text(),"'2.0.1-test.7'","'2.0.1-test.8'"))
for f in ['README.md','README.en.md']:
    p=r/f;s=p.read_text().replace('2.0.1-test.7','2.0.1-test.8')
    anchor='## 选择性主动通知 Dot' if f=='README.md' else '## Selective proactive notifications to Dot'
    intro=('本版更新了 Dots 设置页：统一字号与表单间距，修正勾选框和标签对齐，分组展示连接、隧道与主动通知设置。详细画面与验证见[本版更新记录](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.1-test.8/docs/releases/v2.0.1-test.8.md)。\n\n' if f=='README.md' else 'This update refines the Dots settings layout: consistent typography, aligned checkboxes and labels, grouped connection and tunnel controls, and compact expandable guidance. See the [update record](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.1-test.8/docs/releases/v2.0.1-test.8.md) for screenshots and verification.\n\n')
    p.write_text(change(s,anchor,intro+anchor))
p=r/'CHANGELOG.md';p.write_text(change(p.read_text(),'# 更新记录\n','# 更新记录\n\n## 2.0.1-test.8（2026-11-14）\n\n调整 Dots 设置页的字号、卡片层级与控件对齐。MCP 开关、主动通知开关和事件勾选框统一为左侧控件、右侧标签；客户端目录与选择按钮并排，隧道安装与连接操作分组。长说明和诊断使用可展开区域，中英文及明暗主题采用统一布局。\n\n[界面与验证记录](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.1-test.8/docs/releases/v2.0.1-test.8.md)\n'))
print('Updated Settings sources, documentation and candidate version; execution behavior preserved.')
