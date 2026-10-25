/** Native DSH main panel and sidebar entry. Uses the user's own ChatGPT web login. */
const React = require('react')
const { createElement: h, useState, useRef, useEffect } = React
const NAMESPACE = 'dsh.dots'
const PANEL_ID = 'dsh-dots'
const DOTS_URL = 'https://chatgpt.com/dots/home'

const zh = {
  panel: 'DSH Dots', title: 'Dots',
  inBrowser: '在浏览器打开', reload: '刷新',
  openFailed: '未能打开网页，请使用系统浏览器访问 ChatGPT Dots。',
  guestFailed: 'DSH 桌面网页载体未能启动，可在浏览器中打开。',
  guestLoading: '正在连接 Dots…',
  fallback: '如果 Dot 网页未能显示，请在浏览器中打开。',
  mockLabel: '模拟 Dot · 仅供测试',
  mockNotice: '这是隔离测试回复，不连接 ChatGPT、真实 Dot 或账户。',
  mockYou: '你', mockAssistant: '模拟 Dot', mockPlaceholder: '输入一条测试消息…',
  mockSend: '发送', mockBusy: '回复中…',
}
const en = {
  panel: 'DSH Dots', title: 'Dots',
  inBrowser: 'Open in browser', reload: 'Reload',
  openFailed: 'Could not open the site. Open ChatGPT Dots in your system browser.',
  guestFailed: 'The DSH Desktop web carrier could not start. Open in your browser.',
  guestLoading: 'Connecting to Dots…',
  fallback: 'If the Dot page is blank, open it in your browser.',
  mockLabel: 'Mock Dot · testing only',
  mockNotice: 'Isolated test replies. Not connected to ChatGPT, a real Dot, or an account.',
  mockYou: 'You', mockAssistant: 'Mock Dot', mockPlaceholder: 'Type a test message…',
  mockSend: 'Send', mockBusy: 'Replying…',
}

/** Only the DSH Desktop bridge may create approved browser guests.
 * Guests are sandboxed by the DSH main process and share no plugin credentials.
 */
function desktopBrowserBridge() {
  const desktop = typeof window === 'object' ? window.dshDesktop : undefined
  return desktop?.protocolVersion === 1 && desktop.browser &&
    typeof desktop.browser.acquire === 'function' &&
    typeof desktop.browser.release === 'function' ? desktop.browser : undefined
}

/** A top-level Electron guest, not an iframe and not a right-sidebar tab.
 * The DSH bridge owns and approves the lease, partition and navigation policy.
 * `dispose` closes this exact guest; no native API or cookies enter the model.
 */
function mountDesktopDotGuest(host, bridge, onError, onLoaded) {
  let disposed = false
  let lease
  let guest
  let unsubscribe = () => {}
  let navigated = false
  const safe = work => { if (!disposed) return work() }
  const navigate = url => {
    if (disposed || !guest || typeof url !== 'string') return
    let parsed
    try { parsed = new URL(url) } catch { return }
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) return
    Promise.resolve(guest.loadURL(parsed.href)).catch(error => safe(() => onError(error)))
  }
  const boot = (async () => {
    try {
      const reservation = await bridge.acquire('dsh-dots:personal-browser')
      if (disposed) { await bridge.release(reservation.lease); return }
      lease = reservation.lease
      guest = document.createElement('webview')
      guest.className = 'dotsWebview'
      guest.setAttribute('name', reservation.lease)
      guest.setAttribute('partition', reservation.partition)
      guest.setAttribute('allowpopups', '')
      guest.setAttribute('src', 'about:blank#' + reservation.lease)
      guest.addEventListener('dom-ready', () => {
        if (navigated || disposed) return
        navigated = true
        navigate(DOTS_URL)
      })
      guest.addEventListener('did-finish-load', () => safe(onLoaded))
      guest.addEventListener('did-fail-load', event => {
        // -3 is Chromium's expected cancellation during a new navigation.
        if (event.isMainFrame && event.errorCode !== -3) safe(() => onError(event.errorDescription || 'Page load failed'))
      })
      guest.addEventListener('render-process-gone', () => safe(() => onError('The browser renderer stopped')))
      if (typeof bridge.onOpenRequested === 'function') unsubscribe = bridge.onOpenRequested(lease, navigate)
      host.append(guest)
    } catch (error) {
      unsubscribe()
      guest?.remove()
      // An approved lease may exist even when webview insertion failed.
      // Release it here and do not release a second time at unmount.
      if (lease) {
        const retired = lease
        lease = undefined
        await bridge.release(retired).catch(() => {})
      }
      safe(() => onError(error))
    }
  })()
  return {
    reload() { if (guest && navigated && !disposed) {
      try { guest.reload() } catch (error) { safe(() => onError(error)) }
    } },
    async dispose() {
      disposed = true
      unsubscribe()
      guest?.remove()
      // If acquire was still pending, boot itself releases that late lease.
      await boot.catch(() => {})
      if (lease) await bridge.release(lease)
    },
  }
}

function DotsWebSurface({ reloadCount, onFailure, onLoaded, t }) {
  const container = useRef(null)
  const owner = useRef(null)
  const bridge = desktopBrowserBridge()
  useEffect(() => {
    if (!bridge || !container.current) return
    const mounted = mountDesktopDotGuest(container.current, bridge,
      () => onFailure(t('guestFailed')), onLoaded)
    owner.current = mounted
    return () => { owner.current = null; void mounted.dispose() }
  }, [bridge])
  useEffect(() => {
    if (reloadCount > 0 && bridge) owner.current?.reload()
  }, [reloadCount, bridge])
  return bridge
    ? h('div', { ref: container, className: 'dotsGuestHost', 'data-testid': 'dots-desktop-webview-host' })
    : h('iframe', { key: reloadCount, className: 'dotsWebFrame', title: 'ChatGPT Dots',
        src: DOTS_URL, referrerPolicy: 'no-referrer',
        sandbox: 'allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox' })
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
/** DSH-native full-bleed shell: only the actual Dots website is the content.
 * We intentionally do not render a redundant framed browser or CSS-inject the
 * cross-origin ChatGPT document. Its own appearance remains site-controlled.
 */
function DotsPage({ t, openExternal, __testDotsBackend }) {
  const [reloadCount, setReloadCount] = useState(0)
  const [error, setError] = useState('')
  const mock = __testDotsBackend !== undefined
  const launchExternal = () => {
    try {
      const opened = openExternal()
      if (opened === false) setError(t('openFailed'))
      else setError('')
    } catch { setError(t('openFailed')) }
  }
  return h('main', { className: 'dotsPage', 'aria-label': 'DSH Dots' },
    h('header', { className: 'dotsToolbar' },
      h('div', { className: 'dotsBrand' },
        h('span', { className: 'dotsMark', 'aria-hidden': 'true' }, h(RingIcon, { size: 23 })),
        h('span', { className: 'dotsBrandName' }, t('title'))),
      mock
        ? h('span', { className: 'dotsMockBadge', 'data-testid': 'mock-badge' }, t('mockLabel'))
        : h('div', { className: 'dotsToolbarActions' },
            h('button', { className: 'dotsTool', type: 'button', onClick: () => setReloadCount(n => n + 1) }, t('reload')),
            h('button', { className: 'dotsTool dotsOpen', type: 'button', onClick: launchExternal, title: t('fallback') }, t('inBrowser')))),
    mock
      ? h(MockDotConversation, { key: 'mock-conversation', backend: __testDotsBackend, t })
      : h('section', { className: 'dotsContent', 'data-testid': 'dots-native-content' },
          h(DotsWebSurface, { reloadCount, onFailure: message => setError(String(message)), onLoaded: () => setError(''), t }),
          error ? h('div', { className: 'dotsEmbedNotice', role: 'alert' },
            h('span', null, error),
            h('button', { className: 'dotsTool dotsOpen', type: 'button', onClick: launchExternal }, t('inBrowser'))) : null))
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
exports.mountDesktopDotGuest = mountDesktopDotGuest
exports.desktopBrowserBridge = desktopBrowserBridge
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
  const openExternal = () => {
    window.open(DOTS_URL, '_blank', 'noopener,noreferrer')
    // noopener may intentionally return null even for a successful open.
    return true
  }
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: PANEL_ID, locale: NAMESPACE,
    inject: () => ({ t, openExternal }),
  }, DotsPage))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: PANEL_ID, order: 25, locale: NAMESPACE, label: () => t('panel'),
  }, DotsSidebarIcon))
}
