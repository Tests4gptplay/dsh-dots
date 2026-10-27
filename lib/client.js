window.__ModuleLoader__.load({ id: 'dsh-dots', factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
const __DOTS_CLIENT_CSS__ = "/* Native DSH panel, with Dot content full-bleed; never style the foreign origin. */\n.dotsPage { color-scheme:light; box-sizing:border-box; position:relative; z-index:2; display:flex; flex-direction:column; flex:1 1 auto; align-self:stretch; width:100%; height:100%; min-height:0; min-width:0; overflow:hidden; color:var(--dsw-alias-label-primary,inherit); background:var(--dsw-alias-bg-base,transparent); }\n.dotsToolbar { box-sizing:border-box; display:flex; flex:none; align-items:center; justify-content:space-between; gap:12px; padding:calc(var(--dsh-frame-top-clearance,0px) + 8px) 18px 9px; min-height:48px; background:var(--dsw-alias-bg-base,transparent); border-bottom:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.18)); }\n.dotsBrand,.dotsToolbarActions { display:inline-flex; align-items:center; gap:9px; min-width:0; }\n.dotsMark,.dotsMark svg { display:block; flex:none; width:23px; height:23px; }\n.dotsBrandName { font-size:14px; font-weight:600; letter-spacing:.01em; }\n.dotsTool { appearance:none; cursor:pointer; border:0; border-radius:var(--dsw-radius-sm,7px); padding:7px 10px; font:inherit; font-size:12px; line-height:1.3; color:inherit; background:transparent; white-space:nowrap; }\n.dotsTool:hover { background:var(--dsw-alias-bg-hover,rgba(127,127,127,.12)); }\n.dotsTool:focus-visible { outline:2px solid currentColor; outline-offset:2px; }\n.dotsOpen { border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.2)); }\n.dotsContent { box-sizing:border-box; position:relative; flex:1 1 0; width:100%; min-height:0; min-width:0; overflow:hidden; background:var(--dsw-alias-bg-base,transparent); }\n.dotsGuestHost,.dotsWebFrame { display:block; position:absolute; inset:0; width:100%; height:100%; box-sizing:border-box; border:0; background:var(--dsw-alias-bg-base,transparent); }\n/* Electron webview uses an internal shadow iframe as a flex child. Do not override its display:flex. */\n.dotsWebview { display:flex; flex:1 1 auto; min-width:0; min-height:0; width:100%; height:100%; border:0; background:transparent; -webkit-app-region:no-drag; }\n.dotsEmbedNotice { position:absolute; bottom:18px; left:50%; transform:translateX(-50%); z-index:1; max-width:calc(100% - 36px); display:flex; gap:12px; align-items:center; padding:10px 12px; border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.22)); border-radius:var(--dsw-radius-md,10px); background:var(--dsw-alias-bg-base,rgba(127,127,127,.12)); color:var(--dsw-alias-label-primary,inherit); box-shadow:0 4px 22px rgba(0,0,0,.1); font-size:12px; }\n.dotsMockBadge { display:inline-flex; border:.5px dashed currentColor; padding:4px 10px; font-size:11px; border-radius:7px; opacity:.75; }\n.dotsDemo { box-sizing:border-box; display:flex; flex-direction:column; min-height:0; flex:1; margin:14px 18px 18px; overflow:hidden; border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.22)); border-radius:var(--dsw-radius-md,10px); }\n.dotsMessages { padding:14px; flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:12px; }\n.dotsMessage { max-width:82%; padding:10px 13px; border-radius:10px; font-size:13px; white-space:pre-wrap; line-height:1.5; background:var(--dsw-alias-bg-surface,rgba(127,127,127,.1)); }\n.dotsMessageUser { align-self:flex-end; background:var(--dsw-alias-bg-hover,rgba(100,120,155,.15)); }\n.dotsMessageFake { align-self:flex-start; }\n.dotsInputRow { display:flex; align-items:center; gap:9px; padding:12px; border-top:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.18)); }\n.dotsInput { flex:1; border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.2)); border-radius:8px; padding:10px; font:inherit; color:inherit; background:transparent; min-width:0; }\n.dotsButton { appearance:none; padding:8px 12px; border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.2)); border-radius:8px; color:inherit; background:transparent; cursor:pointer; }\n.dotsButtonPrimary { background:var(--dsw-alias-bg-hover,rgba(127,127,127,.12)); }\n.dotsTestNote { font-size:11px; opacity:.68; margin:8px 18px 0; }\n.dotsProblem { font-size:12px; color:var(--dsw-alias-label-error,#bb4949); }\n.dotsSidebarIcon { display:inline-flex; align-items:center; justify-content:center; vertical-align:middle; color:inherit; }\n.dotsSidebarIcon svg { display:block; width:100%; height:100%; }\n@media(max-width:540px) { .dotsToolbar { padding-inline:11px; } .dotsTool { padding:6px; } .dotsEmbedNotice { flex-wrap:wrap; } }\n\n/* DSH is authoritative for Light/Dark/System; prefer its resolved theme attribute. */\nbody[data-ds-dark-theme] .dotsPage { color-scheme:dark; }\n\n/* Fallback host: keeps the proven in-slot page filling the native center column. */\n.dotsFallbackHost { box-sizing:border-box; position:relative; z-index:2; display:flex; flex-direction:column; flex:1 1 0; min-height:0; min-width:0; width:100%; position:relative; }\n.dotsDiagnostic { position:absolute; left:12px; bottom:12px; z-index:3; padding:4px 9px; border-radius:6px; font:600 13px/1.5 ui-monospace,monospace; color:#fff; background:rgba(0,0,0,.66); pointer-events:none; }\n";
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
  return desktop?.browser &&
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

/** Plain-DOM ring used by the persistent page; the React icon stays for the Web panel. */
function ringSvgNode(size) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('viewBox', '0 0 100 100')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('aria-hidden', 'true')
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', '50')
  circle.setAttribute('cy', '50')
  circle.setAttribute('r', '32')
  circle.setAttribute('stroke', 'currentColor')
  circle.setAttribute('stroke-width', '30')
  svg.append(circle)
  return svg
}

/** One guest for the whole plugin lifetime, in a normal flex child of DSH's
 * center column. Panel switches only toggle visibility, so the webpage is
 * never reparented, reloaded or recreated by a slot remount. */
function mountPersistentDotsPage(bridge, t, openExternal) {
  let disposed = false
  let page
  let host
  let notice
  let noticeText
  let guest
  let observer
  let error = ''
  const setError = message => {
    error = message ? String(message) : ''
    if (!notice) return
    notice.style.display = error ? 'flex' : 'none'
    if (noticeText) noticeText.textContent = error
  }
  const external = () => { try { openExternal() } catch {} }
  const build = () => {
    const node = document.createElement('div')
    node.className = 'dotsPage dotsPersistentPage'
    node.setAttribute('aria-label', 'DSH Dots')
    node.style.display = 'none'
    const toolbar = document.createElement('header')
    toolbar.className = 'dotsToolbar'
    const brand = document.createElement('div')
    brand.className = 'dotsBrand'
    const mark = document.createElement('span')
    mark.className = 'dotsMark'
    mark.setAttribute('aria-hidden', 'true')
    mark.append(ringSvgNode(23))
    const name = document.createElement('span')
    name.className = 'dotsBrandName'
    name.textContent = t('title')
    brand.append(mark, name)
    const actions = document.createElement('div')
    actions.className = 'dotsToolbarActions'
    const reload = document.createElement('button')
    reload.className = 'dotsTool dotsReload'
    reload.setAttribute('type', 'button')
    reload.textContent = t('reload')
    reload.addEventListener('click', () => { if (guest) guest.reload() })
    const open = document.createElement('button')
    open.className = 'dotsTool dotsOpen'
    open.setAttribute('type', 'button')
    open.textContent = t('inBrowser')
    open.setAttribute('title', t('fallback'))
    open.addEventListener('click', external)
    actions.append(reload, open)
    toolbar.append(brand, actions)
    const content = document.createElement('section')
    content.className = 'dotsContent'
    content.setAttribute('data-testid', 'dots-native-content')
    host = document.createElement('div')
    host.className = 'dotsGuestHost'
    host.setAttribute('data-testid', 'dots-desktop-webview-host')
    notice = document.createElement('div')
    notice.className = 'dotsEmbedNotice'
    notice.setAttribute('role', 'alert')
    notice.style.display = 'none'
    noticeText = document.createElement('span')
    const noticeOpen = document.createElement('button')
    noticeOpen.className = 'dotsTool dotsOpen'
    noticeOpen.setAttribute('type', 'button')
    noticeOpen.textContent = t('inBrowser')
    noticeOpen.addEventListener('click', external)
    notice.append(noticeText, noticeOpen)
    content.append(host, notice)
    node.append(toolbar, content)
    return node
  }
  const show = () => {
    if (!page) return
    page.style.display = 'flex'
    page.setAttribute('aria-hidden', 'false')
  }
  const hide = () => {
    if (!page) return
    page.style.display = 'none'
    page.setAttribute('aria-hidden', 'true')
  }
  const attach = () => {
    if (disposed || page) return Boolean(page)
    const column = document.querySelector('[data-slot="main"]')?.parentElement
    if (!column) return false
    page = build()
    // The center column survives panel changes; the slot outlet only swaps
    // its own contents, so this node stays connected with its guest alive.
    column.append(page)
    hide()
    guest = mountDesktopDotGuest(host, bridge, setError, () => setError(''))
    observer?.disconnect()
    observer = undefined
    return true
  }
  if (!attach()) {
    observer = new MutationObserver(() => attach())
    observer.observe(document.body, { childList: true, subtree: true })
  }
  const isVisible = () => {
    if (!page || !page.isConnected) return false
    if (typeof getComputedStyle === 'function' && getComputedStyle(page).display === 'none') return false
    if (typeof page.getBoundingClientRect !== 'function') return true
    return page.getBoundingClientRect().height > 0
  }
  const statusText = () => {
    const slot = document.querySelector('[data-slot="main"]')
    const parent = slot?.parentElement
    const height = page?.getBoundingClientRect?.().height ?? 0
    return `slot=${slot ? 1 : 0} parent=${parent?.className?.split(' ')[0] || '-'} page=${page ? 1 : 0} h=${Math.round(height)}`
  }
  return {
    attach, show, hide, isVisible, statusText,
    reload() { if (guest) guest.reload() },
    dispose() {
      disposed = true
      observer?.disconnect()
      guest?.dispose()
      page?.remove()
      page = undefined
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
exports.mountPersistentDotsPage = mountPersistentDotsPage
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
  const persistent = Boolean(desktopBrowserBridge())
  let persistentPage
  ctx.effect(() => {
    if (!persistent) return
    persistentPage = mountPersistentDotsPage(desktopBrowserBridge(), t, openExternal)
    return () => persistentPage?.dispose()
  }, 'dsh-dots.preload')
  const MainEntry = persistent ? function DotsNativeSlot({ t: translate, openExternal: open }) {
    // Mounting the slot is the authoritative signal that Dots is selected:
    // show the persistent page and hide it again when the panel is replaced.
    // If that page cannot be shown, fall back to the proven in-slot renderer
    // instead of leaving an empty panel.
    const [fallback, setFallback] = useState(false)
    const [status, setStatus] = useState('')
    useEffect(() => {
      if (fallback) return
      persistentPage?.attach()
      persistentPage?.show()
      if (persistentPage?.isVisible()) return () => persistentPage?.hide()
      setStatus(persistentPage?.statusText() || 'session=missing')
      persistentPage?.dispose()
      persistentPage = undefined
      setFallback(true)
    }, [fallback])
    if (!fallback) return null
    return h('div', { className: 'dotsFallbackHost' },
      h(DotsPage, { t: translate, openExternal: open }),
      h('div', { className: 'dotsDiagnostic', title: status }, status))
  } : DotsPage
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: PANEL_ID, locale: NAMESPACE,
    inject: () => ({ t, openExternal }),
  }, MainEntry))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: PANEL_ID, order: 25, locale: NAMESPACE, label: () => t('panel'),
  }, DotsSidebarIcon))
}

return module.exports; } });
