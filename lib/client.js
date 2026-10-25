window.__ModuleLoader__.load({ id: 'dsh-dots', factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
const __DOTS_CLIENT_CSS__ = "/* All rules scoped: do not alter the DSH host or the embedded ChatGPT origin. */\n.dotsPage { width:100%; height:100%; min-height:600px; display:flex; flex-direction:column; padding:24px 28px; gap:16px; color:var(--dsw-alias-label-primary,inherit); box-sizing:border-box; }\n.dotsTop { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }\n.dotsLogo { width:36px; height:36px; flex:none; }\n.dotsLogo circle { stroke:currentColor; }\n.dotsTitle { font-size:19px; line-height:1.25; margin:0; font-weight:650; }\n.dotsSubtitle { font-size:12px; opacity:.66; margin:3px 0 0; }\n.dotsActions { margin-left:auto; display:flex; gap:8px; flex-wrap:wrap; }\n.dotsButton { appearance:none; padding:8px 12px; border:1px solid var(--dsw-alias-border-l3,#84888855); border-radius:9px; background:transparent; color:inherit; font-size:12px; line-height:1.4; cursor:pointer; }\n.dotsButton:hover { background:var(--dsw-alias-bg-hover,rgba(127,127,127,.12)); }\n.dotsButton:focus-visible { outline:2px solid currentColor; outline-offset:2px; }\n.dotsButtonPrimary { background:var(--dsw-alias-bg-strong,rgba(127,127,127,.12)); font-weight:550; }\n.dotsBanner { margin:0; font-size:12px; line-height:1.6; opacity:.7; }\n.dotsFrameWrap { flex:1; min-height:390px; border:1px solid var(--dsw-alias-border-l3,#8884); border-radius:12px; overflow:hidden; background:var(--dsw-alias-bg-surface,#fafafa); position:relative; }\n.dotsFrame { width:100%; height:100%; display:block; border:0; background:#fff; }\n.dotsBottom { font-size:11px; line-height:1.6; opacity:.7; }\n.dotsProblem { color:var(--dsw-alias-label-error,#b63b3b); font-size:12px; }\n.dotsMockBadge { display:inline-flex; border:1px dashed currentColor; padding:4px 10px; font-size:11px; border-radius:8px; opacity:.9; }\n.dotsDemo { flex:1; border:1px solid var(--dsw-alias-border-l3,#8884); border-radius:12px; display:flex; flex-direction:column; min-height:360px; overflow:hidden; }\n.dotsMessages { padding:14px; flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:12px; }\n.dotsMessage { max-width:82%; padding:10px 13px; border-radius:10px; font-size:13px; white-space:pre-wrap; line-height:1.5; background:var(--dsw-alias-bg-surface,rgba(127,127,127,.1)); }\n.dotsMessageUser { align-self:flex-end; background:var(--dsw-alias-bg-hover,rgba(100,120,155,.15)); }\n.dotsMessageFake { align-self:flex-start; }\n.dotsInputRow { display:flex; align-items:center; gap:9px; padding:12px; border-top:1px solid var(--dsw-alias-border-l3,#8884); }\n.dotsInput { flex:1; border:1px solid var(--dsw-alias-border-l3,#8884); border-radius:8px; padding:10px; font:inherit; color:inherit; background:transparent; min-width:0; }\n.dotsTestNote { font-size:11px; opacity:.7; margin:0; }\n.dotsSidebarIcon { display:inline-flex; align-items:center; justify-content:center; vertical-align:middle; color:inherit; }\n.dotsSidebarIcon svg { display:block; width:100%; height:100%; }\n@media (max-width:700px) { .dotsPage { padding:16px; gap:12px; } .dotsActions { margin-left:0; width:100%; } .dotsFrameWrap { min-height:380px; } .dotsTitle { font-size:17px; } }\n";
/** Native DSH main panel and sidebar entry. Uses the user's own ChatGPT web login. */
const React = require('react')
const { createElement: h, useState } = React
const NAMESPACE = 'dsh.dots'
const PANEL_ID = 'dsh-dots'
const DOTS_URL = 'https://chatgpt.com/dots/home'

const zh = {
  panel: 'DSH Dots',
  title: 'DSH Dots',
  subtitle: 'ChatGPT Dots 网页入口',
  inDsh: '在 DSH 浏览器打开',
  inBrowser: '在系统浏览器打开',
  reload: '重新加载',
  notice: '请在 ChatGPT 官方网页完成登录；网页嵌入和登录可能受到网站安全策略限制。',
  fallback: '页面空白或登录失败？请使用上方的 DSH 浏览器或系统浏览器入口。',
  openError: '当前 DSH 浏览器不可用，可改用系统浏览器打开。',
  mockLabel: '模拟 Dot · 仅供测试',
  mockNotice: '这是隔离测试回复，不连接 ChatGPT、真实 Dot 或账户。',
  mockYou: '你',
  mockAssistant: '模拟 Dot',
  mockPlaceholder: '输入一条测试消息…',
  mockSend: '发送',
  mockBusy: '回复中…',
}
const en = {
  panel: 'DSH Dots', title: 'DSH Dots', subtitle: 'ChatGPT Dots web entry',
  inDsh: 'Open in DSH Browser', inBrowser: 'Open in system browser', reload: 'Reload',
  notice: 'Sign in on the official ChatGPT site. Embedding and sign-in may be restricted by website security policies.',
  fallback: 'Blank page or sign-in issue? Open using DSH Browser or your system browser.',
  openError: 'DSH Browser is unavailable. Open in the system browser instead.',
  mockLabel: 'Mock Dot · testing only',
  mockNotice: 'Isolated test replies. Not connected to ChatGPT, a real Dot, or an account.',
  mockYou: 'You', mockAssistant: 'Mock Dot', mockPlaceholder: 'Type a test message…',
  mockSend: 'Send', mockBusy: 'Replying…',
}

function RingIcon({ size = 24 }) {
  return h('svg', { width: size, height: size, viewBox: '0 0 100 100',
    fill: 'none', role: 'img', 'aria-label': 'Dots 圆环' },
    h('circle', { cx: 50, cy: 50, r: 32, stroke: 'currentColor', strokeWidth: 30 }))
}
function DotsSidebarIcon({ size = 18 }) {
  return h('span', { className: 'dotsSidebarIcon', style: { width: size, height: size }, 'aria-hidden': 'true' }, h(RingIcon, { size }))
}

/** Only the test harness passes __testDotsBackend; this is NOT wired into DSH production. */
function DotsPage({ t, openDshBrowser, openExternal, __testDotsBackend }) {
  const [reloadCount, setReloadCount] = useState(0)
  const [error, setError] = useState('')
  const mock = __testDotsBackend !== undefined
  const launchInDsh = () => {
    try {
      const ok = openDshBrowser()
      if (ok === false) setError(t('openError'))
      else setError('')
    } catch (_e) { setError(t('openError')) }
  }
  return h('main', { className: 'dotsPage', 'aria-label': t('title') },
    h('header', { className: 'dotsTop' },
      h('span', { className: 'dotsLogo', 'aria-hidden': 'true' }, h(RingIcon, { size: 36 })),
      h('div', null, h('h1', { className: 'dotsTitle' }, t('title')),
        h('p', { className: 'dotsSubtitle' }, t('subtitle'))),
      mock
        ? h('span', { className: 'dotsMockBadge', 'data-testid': 'mock-badge' }, t('mockLabel'))
        : h('div', { className: 'dotsActions' },
            h('button', { className: 'dotsButton dotsButtonPrimary', type: 'button', onClick: launchInDsh }, t('inDsh')),
            h('button', { className: 'dotsButton', type: 'button', onClick: openExternal }, t('inBrowser')),
            h('button', { className: 'dotsButton', type: 'button', onClick: () => setReloadCount(n => n + 1) }, t('reload')))),
    mock
      ? h(MockDotConversation, { key: 'mock-conversation', backend: __testDotsBackend, t })
      : h(React.Fragment, null,
          h('p', { className: 'dotsBanner' }, t('notice')),
          error ? h('p', { role: 'alert', className: 'dotsProblem' }, error) : null,
          h('div', { className: 'dotsFrameWrap' },
            h('iframe', { key: reloadCount, className: 'dotsFrame', title: 'ChatGPT Dots',
              src: DOTS_URL, referrerPolicy: 'no-referrer',
              sandbox: 'allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox',
            })),
          h('div', { className: 'dotsBottom' }, t('fallback'))))
}

/** Deliberately isolated mock view; production inject() never passes a fake backend. */
function MockDotConversation({ backend, t }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const send = async e => {
    e.preventDefault()
    if (busy || !draft.trim()) return
    const text = draft.trim()
    setDraft('')
    setError('')
    setBusy(true)
    setMessages(old => [...old, { id: `u-${old.length}`, kind: 'user', text }])
    try {
      const response = await backend.reply({ text })
      const body = String(response?.text ?? '')
      if (!body) throw new Error('Mock backend returned an empty response')
      setMessages(old => [...old, { id: `d-${old.length}`, kind: 'dot', text: body }])
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }
  return h(React.Fragment, null,
    h('p', { className: 'dotsTestNote' }, t('mockNotice')),
    h('section', { className: 'dotsDemo', 'data-testid': 'mock-conversation' },
      h('div', { className: 'dotsMessages', 'aria-live': 'polite' }, messages.map(message =>
        h('div', { key: message.id, className: `dotsMessage ${message.kind === 'user' ? 'dotsMessageUser' : 'dotsMessageFake'}` },
          h('b', null, message.kind === 'user' ? t('mockYou') : t('mockAssistant')), ': ', message.text))),
      error ? h('p', { role: 'alert', className: 'dotsProblem', 'data-testid': 'mock-error' }, error) : null,
      h('form', { className: 'dotsInputRow', onSubmit: send },
        h('input', { className: 'dotsInput', type: 'text', 'aria-label': t('mockPlaceholder'),
          placeholder: t('mockPlaceholder'), value: draft, onChange: e => setDraft(e.target.value), disabled: busy }),
        h('button', { className: 'dotsButton dotsButtonPrimary', type: 'submit', disabled: busy || !draft.trim() },
          busy ? t('mockBusy') : t('mockSend')))))
}

exports.name = 'dsh-dots-client'
exports.inject = ['slots', 'locale']
exports.RingIcon = RingIcon
exports.DotsSidebarIcon = DotsSidebarIcon
exports.DotsPage = DotsPage
exports.zh = zh
exports.en = en
exports.DOTS_URL = DOTS_URL
exports.apply = function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NAMESPACE, { zh, en }), 'dsh-dots.localization')
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dshDots = 'client'
    style.textContent = __DOTS_CLIENT_CSS__
    document.head.append(style)
    return () => style.remove()
  }, 'dsh-dots.style')
  const t = ctx.locale.bind(NAMESPACE)
  const openDshBrowser = () => {
    const service = ctx.get('sidebarRight', true)
    if (!service || typeof service.openTab !== 'function') return false
    // When present, the native tab registry establishes whether Browser is installed.
    // Browsing capability is optional across DSH profiles and host releases.
    const registry = ctx.get('sidebarRightTabs', true)
    if (registry && typeof registry.get === 'function' && !registry.get('browser')) return false
    service.openTab('browser', { params: { url: DOTS_URL } })
    return true
  }
  const openExternal = () => { window.open(DOTS_URL, '_blank', 'noopener,noreferrer') }
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: PANEL_ID, locale: NAMESPACE,
    inject: () => ({ t, openDshBrowser, openExternal }),
  }, DotsPage))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: PANEL_ID, order: 25, locale: NAMESPACE, label: () => t('panel'),
  }, DotsSidebarIcon))
}

return module.exports; } });
