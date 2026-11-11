window.__ModuleLoader__.load({ id: "dsh-dots", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
const __DOTS_CLIENT_CSS__ = "/* Native DSH panel, with Dot content full-bleed; never style the foreign origin. */\n.dotsPage { color-scheme:light; box-sizing:border-box; position:relative; z-index:2; display:flex; flex-direction:column; flex:1 1 auto; align-self:stretch; width:100%; height:100%; min-height:0; min-width:0; overflow:hidden; color:var(--dsw-alias-label-primary,inherit); background:var(--dsw-alias-bg-base,transparent); }\n.dotsToolbar { box-sizing:border-box; display:flex; flex:none; align-items:center; justify-content:space-between; gap:12px; padding:calc(var(--dsh-frame-top-clearance,0px) + 8px) 18px 9px; min-height:48px; background:var(--dsw-alias-bg-base,transparent); border-bottom:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.18)); }\n.dotsBrand,.dotsToolbarActions { display:inline-flex; align-items:center; gap:9px; min-width:0; }\n.dotsMark,.dotsMark svg { display:block; flex:none; width:23px; height:23px; }\n.dotsBrandName { font-size:14px; font-weight:600; letter-spacing:.01em; }\n.dotsTool { appearance:none; cursor:pointer; border:0; border-radius:var(--dsw-radius-sm,7px); padding:7px 10px; font:inherit; font-size:12px; line-height:1.3; color:inherit; background:transparent; white-space:nowrap; }\n.dotsTool:hover { background:var(--dsw-alias-bg-hover,rgba(127,127,127,.12)); }\n.dotsTool:focus-visible { outline:2px solid currentColor; outline-offset:2px; }\n.dotsOpen { border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.2)); }\n.dotsContent { box-sizing:border-box; position:relative; flex:1 1 0; width:100%; min-height:0; min-width:0; overflow:hidden; background:var(--dsw-alias-bg-base,transparent); }\n.dotsGuestHost,.dotsWebFrame { display:block; position:absolute; inset:0; width:100%; height:100%; box-sizing:border-box; border:0; background:var(--dsw-alias-bg-base,transparent); }\n/* Electron webview uses an internal shadow iframe as a flex child. Do not override its display:flex. */\n.dotsWebview { display:flex; flex:1 1 auto; min-width:0; min-height:0; width:100%; height:100%; border:0; background:transparent; -webkit-app-region:no-drag; }\n.dotsEmbedNotice { position:absolute; bottom:18px; left:50%; transform:translateX(-50%); z-index:1; max-width:calc(100% - 36px); display:flex; gap:12px; align-items:center; padding:10px 12px; border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.22)); border-radius:var(--dsw-radius-md,10px); background:var(--dsw-alias-bg-base,rgba(127,127,127,.12)); color:var(--dsw-alias-label-primary,inherit); box-shadow:0 4px 22px rgba(0,0,0,.1); font-size:12px; }\n.dotsSidebarIcon { display:inline-flex; align-items:center; justify-content:center; vertical-align:middle; color:inherit; }\n.dotsSidebarIcon svg { display:block; width:100%; height:100%; }\n@media(max-width:540px) { .dotsToolbar { padding-inline:11px; } .dotsTool { padding:6px; } .dotsEmbedNotice { flex-wrap:wrap; } }\n\n/* DSH is authoritative for Light/Dark/System; prefer its resolved theme attribute. */\nbody[data-ds-dark-theme] .dotsPage { color-scheme:dark; }\n\n/* Fallback host: keeps the proven in-slot page filling the native center column. */\n.dotsFallbackHost { box-sizing:border-box; position:relative; z-index:2; display:flex; flex-direction:column; flex:1 1 0; min-height:0; min-width:0; width:100%; position:relative; }\n\n/* Dots settings use the existing DSH theme; no global selectors. */\n.dotsSettings { width: 100%; overflow: auto; }\n.dotsMcpSettings { padding: 16px; max-width: 760px; line-height: 1.5; }\n.dotsMcpSettings h3 { margin-top: 0; }\n.dotsMcpSettings p { overflow-wrap: anywhere; }\n.dotsMcpSwitch, .dotsMcpRow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }\n.dotsMcpSwitch { cursor: pointer; }\n.dotsMcpField { display: flex; flex-direction: column; gap: 6px; margin: 12px 0; }\n.dotsMcpField input { min-width: 0; flex: 1; padding: 8px; color: inherit; background: transparent; border: 1px solid var(--dsw-alias-border-l3, #8886); border-radius: 7px; }\n.dotsMcpButton { padding: 8px 12px; color: inherit; background: transparent; border: 1px solid var(--dsw-alias-border-l3, #8886); border-radius: 7px; cursor: pointer; }\n.dotsMcpButton:disabled { opacity: .5; cursor: default; }\n.dotsMcpHint { opacity: .75; font-size: .92em; }\n.dotsMcpLinks { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }\n.dotsMcpLinks a { color: inherit; text-decoration: underline; }\n.dotsMcpSettings details { margin-top: 16px; }\n\n.dotsTunnelSettings{margin:20px 0;padding:16px;border:1px solid var(--dsw-alias-border-l3,#8886);border-radius:8px}.dotsTunnelSettings input{width:100%;box-sizing:border-box}.dotsTunnelSettings h4{margin-top:0}\n";
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
  persistenceNav: 'Dots 登录保持', persistenceTitle: 'Dots 登录保持',
  persistenceDescription: '将 Dots 专属浏览器分区保存为持久分区。操作只修改 DSH Desktop 的浏览器分区分配逻辑，保留原版备份；完成后重新启动 DSH 生效。DSH 升级覆盖修改后可重新应用。',
  persistenceCheck: '检查状态', persistenceApply: '一键应用', persistenceRestore: '恢复原版',
  persistenceWaiting: '正在检查…', persistenceBusy: '正在操作…', persistenceApplied: '已应用',
  persistenceAvailable: '等待应用', persistenceScheduled: '已安排：完全退出 DSH 后完成当前操作', persistenceMissing: '未找到 DSH Desktop 安装文件',
  persistenceIncompatible: '当前安装文件的浏览器代码需要适配',
  persistenceRestart: '修改完成，请完全退出并重新启动 DSH Desktop。',
  persistenceRestored: '已恢复原版，请重新启动 DSH Desktop。',
  persistenceAlready: '当前 DSH Desktop 已应用 Dots 登录保持修复。',
  persistencePath: '目标文件', persistenceError: '操作失败：',
}
const en = {
  panel: 'DSH Dots', title: 'Dots',
  inBrowser: 'Open in browser', reload: 'Reload',
  openFailed: 'Could not open the site. Open ChatGPT Dots in your system browser.',
  guestFailed: 'The DSH Desktop web carrier could not start. Open in your browser.',
  guestLoading: 'Connecting to Dots…',
  fallback: 'If the Dot page is blank, open it in your browser.',
  persistenceNav: 'Dots Login Retention', persistenceTitle: 'Dots Login Retention',
  persistenceDescription: 'Use a persistent browser partition for Dots. This changes only the Dots-specific partition allocation in DSH Desktop and keeps an original backup. Restart DSH to activate. Apply again if a DSH upgrade replaces the change.',
  persistenceCheck: 'Check status', persistenceApply: 'Apply', persistenceRestore: 'Restore original',
  persistenceWaiting: 'Checking…', persistenceBusy: 'Working…', persistenceApplied: 'Applied',
  persistenceAvailable: 'Ready to apply', persistenceScheduled: 'Scheduled: fully quit DSH to complete this operation', persistenceMissing: 'DSH Desktop installation not found',
  persistenceIncompatible: 'Installed browser code requires an updated adapter',
  persistenceRestart: 'Change applied. Fully quit and restart DSH Desktop.',
  persistenceRestored: 'Original restored. Restart DSH Desktop.',
  persistenceAlready: 'Dots login retention is already applied to DSH Desktop.',
  persistencePath: 'Target file', persistenceError: 'Operation failed: ',
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
  let disposePromise
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
    dispose() {
      if (disposePromise) return disposePromise
      disposed = true
      unsubscribe()
      guest?.remove()
      // If acquire was still pending, boot itself releases that late lease.
      disposePromise = (async () => {
        await boot.catch(() => {})
        if (lease) {
          const retired = lease
          lease = undefined
          await bridge.release(retired)
        }
      })()
      return disposePromise
    },
  }
}

/** Report release failures at the UI boundary, after disposal has already been requested. */
function disposeDesktopGuest(guest) {
  if (guest) void guest.dispose().catch(error => console.error('DSH Dots: desktop browser release failed', error))
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
  const labels = []
  const translate = (node, key, attribute) => {
    labels.push(() => { if (attribute) node.setAttribute(attribute, t(key)); else node.textContent = t(key) })
    labels[labels.length - 1]()
  }
  const refreshLocale = () => {
    for (const update of labels) update()
    if (noticeText) noticeText.textContent = error ? t(error) : ''
  }
  const setError = message => {
    error = message ? String(message) : ''
    if (!notice) return
    notice.style.display = error ? 'flex' : 'none'
    if (noticeText) noticeText.textContent = error ? t(error) : ''
  }
  const external = () => {
    try { setError(openExternal() === false ? 'openFailed' : '') }
    catch { setError('openFailed') }
  }
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
    translate(name, 'title')
    brand.append(mark, name)
    const actions = document.createElement('div')
    actions.className = 'dotsToolbarActions'
    const reload = document.createElement('button')
    reload.className = 'dotsTool dotsReload'
    reload.setAttribute('type', 'button')
    translate(reload, 'reload')
    reload.addEventListener('click', () => { if (guest) guest.reload() })
    const open = document.createElement('button')
    open.className = 'dotsTool dotsOpen'
    open.setAttribute('type', 'button')
    translate(open, 'inBrowser')
    translate(open, 'fallback', 'title')
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
    translate(noticeOpen, 'inBrowser')
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
    guest = mountDesktopDotGuest(host, bridge, () => setError('guestFailed'), () => setError(''))
    observer?.disconnect()
    observer = undefined
    return true
  }
  if (!attach()) {
    observer = new MutationObserver(() => attach())
    observer.observe(document.body, { childList: true, subtree: true })
  }
  const isVisible = () => Boolean(page?.isConnected)
    && (typeof getComputedStyle !== 'function' || getComputedStyle(page).display !== 'none')
  return {
    attach, show, hide, isVisible, refreshLocale,
    reload() { if (guest) guest.reload() },
    dispose() {
      disposed = true
      observer?.disconnect()
      disposeDesktopGuest(guest)
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
    return () => { owner.current = null; disposeDesktopGuest(mounted) }
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
    fill: 'none', 'aria-hidden': 'true' },
    h('circle', { cx: 50, cy: 50, r: 32, stroke: 'currentColor', strokeWidth: 30 }))
}
function DotsSidebarIcon({ size = 18 }) {
  return h('span', { className: 'dotsSidebarIcon', style: { width: size, height: size }, 'aria-hidden': 'true' }, h(RingIcon, { size }))
}

/** DSH-native full-bleed shell. The actual Dots website owns its content. */
function DotsPage({ t, openExternal }) {
  const [reloadCount, setReloadCount] = useState(0)
  const [error, setError] = useState('')
  const launchExternal = () => {
    try { setError(openExternal() === false ? 'openFailed' : '') }
    catch { setError('openFailed') }
  }
  return h('main', { className: 'dotsPage', 'aria-label': 'DSH Dots' },
    h('header', { className: 'dotsToolbar' },
      h('div', { className: 'dotsBrand' },
        h('span', { className: 'dotsMark', 'aria-hidden': 'true' }, h(RingIcon, { size: 23 })),
        h('span', { className: 'dotsBrandName' }, t('title'))),
      h('div', { className: 'dotsToolbarActions' },
        h('button', { className: 'dotsTool', type: 'button', onClick: () => setReloadCount(n => n + 1) }, t('reload')),
        h('button', { className: 'dotsTool dotsOpen', type: 'button', onClick: launchExternal, title: t('fallback') }, t('inBrowser')))),
    h('section', { className: 'dotsContent', 'data-testid': 'dots-native-content' },
      h(DotsWebSurface, { reloadCount, onFailure: () => setError('guestFailed'), onLoaded: () => setError(''), t }),
      error ? h('div', { className: 'dotsEmbedNotice', role: 'alert' },
        h('span', null, t(error)),
        h('button', { className: 'dotsTool dotsOpen', type: 'button', onClick: launchExternal }, t('inBrowser'))) : null))
}


/** DSH Settings section: maintenance stays outside the Dots main page and Plugins page. */
function DotsPersistenceSettings({ t, rpc, mcpRpc, tunnelRpc, desktop = true }) {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const alive = useRef(true)
  const check = async (signal) => {
    const value = await rpc('status', signal)
    if (!signal?.aborted && alive.current) { setStatus(value); if (value?.error) setMessage(t('persistenceError') + value.error) }
    return value
  }
  useEffect(() => {
    alive.current = true
    const controller = new AbortController()
    if (desktop) void check(controller.signal).catch(error => { if (!controller.signal.aborted && alive.current) setMessage(t('persistenceError') + String(error.message || error)) })
    return () => { alive.current = false; controller.abort() }
  }, [])
  const act = async endpoint => {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      const result = await rpc(endpoint)
      if (!alive.current) return
      setStatus(result)
      setMessage(result.state === 'scheduled' ? t('persistenceScheduled')
        : endpoint === 'restore' ? t('persistenceRestored')
          : result.changed ? t('persistenceRestart') : t('persistenceAlready'))
    } catch (error) {
      if (alive.current) setMessage(t('persistenceError') + String(error.message || error))
    } finally { if (alive.current) setBusy(false) }
  }
  const state = status?.state
  const summary = state === 'applied' ? t('persistenceApplied')
    : state === 'available' ? t('persistenceAvailable')
    : state === 'scheduled' ? t('persistenceScheduled')
    : state === 'not-found' ? t('persistenceMissing')
    : state === 'incompatible' ? t('persistenceIncompatible') : t('persistenceWaiting')
  const button = (key, action, enabled = true) => h('button', {
    type: 'button', disabled: busy || !enabled, onClick: action,
    style: { border: '1px solid var(--dsw-alias-border-l3, #8886)', borderRadius: 7,
      padding: '8px 12px', background: 'transparent', color: 'inherit', cursor: 'pointer' },
  }, t(key))
  const persistence = h('section', { 'data-testid': 'dots-persistence-settings', style: { padding: 16, maxWidth: 760 } },
    h('h3', { style: { marginTop: 0 } }, t('persistenceTitle')),
    h('p', null, t('persistenceDescription')),
    h('p', { 'data-testid': 'dots-persistence-status' }, summary),
    status?.archive ? h('p', { style: { overflowWrap: 'anywhere', opacity: .7, fontSize: 12 } },
      t('persistencePath') + ': ' + status.archive) : null,
    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
      button('persistenceCheck', () => { setMessage(''); void check().catch(error => setMessage(t('persistenceError') + String(error.message || error))) }),
      button('persistenceApply', () => { void act('apply') }, state === 'available'),
      button('persistenceRestore', () => { void act('restore') }, state === 'applied' && status?.canRestore === true)),
    message ? h('p', { role: 'status' }, message) : null)
  return h('div', { className: 'dotsSettings' }, desktop ? persistence : null, mcpRpc ? h(DotsMcpSettings, { t, mcpRpc, tunnelRpc }) : null)
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
exports.DotsPersistenceSettings = DotsPersistenceSettings
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
  {
    const rpc = async (endpoint, signal) => {
      const connection = ctx.get?.('connection') ?? ctx.connection
      if (!connection?.rpc) throw new Error('DSH connection is not available')
      const response = await connection.rpc.call('/api', 'dsh-dots-persistence/' + endpoint, {}, signal)
      if (!response?.ok) throw new Error(response?.error?.message || 'Dots persistence request failed')
      return response.value
    }
    const mcpRpc = async (endpoint, payload = {}, signal) => {
      const connection = ctx.get?.('connection') ?? ctx.connection
      if (!connection?.rpc) throw new Error('DSH connection is not available')
      const response = await connection.rpc.call('/api', 'dsh-dots-mcp/' + endpoint, payload, signal)
      if (!response?.ok) throw new Error(response?.error?.message || 'Dots MCP request failed')
      return response.value
    }
    const tunnelRpc = async (endpoint, payload = {}, signal) => {
      const connection = ctx.get?.('connection') ?? ctx.connection
      if (!connection?.rpc) throw new Error('DSH connection is not available')
      const response = await connection.rpc.call('/api', 'dsh-dots-tunnel/' + endpoint, payload, signal)
      if (!response?.ok) throw new Error(response?.error?.message || 'Tunnel request failed')
      return response.value
    }
    ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section', id: 'dsh-dots-login-retention', order: 25,
      locale: NAMESPACE, label: () => t('persistenceNav'), inject: () => ({ t, rpc, mcpRpc, tunnelRpc, desktop: persistent }),
    }, DotsPersistenceSettings))
  }
  let persistentPage
  ctx.effect(() => {
    if (!persistent) return
    persistentPage = mountPersistentDotsPage(desktopBrowserBridge(), t, openExternal)
    const unsubscribe = ctx.locale.subscribe(() => persistentPage?.refreshLocale())
    return () => { unsubscribe(); persistentPage?.dispose() }
  }, 'dsh-dots.preload')
  const MainEntry = persistent ? function DotsNativeSlot({ t: translate, openExternal: open }) {
    // Mounting the slot is the authoritative signal that Dots is selected:
    // show the persistent page and hide it again when the panel is replaced.
    // If that page cannot be shown, fall back to the proven in-slot renderer
    // instead of leaving an empty panel.
    const [fallback, setFallback] = useState(false)
    useEffect(() => {
      if (fallback) return
      persistentPage?.attach()
      persistentPage?.show()
      if (persistentPage?.isVisible()) return () => persistentPage?.hide()
      persistentPage?.dispose()
      persistentPage = undefined
      setFallback(true)
    }, [fallback])
    if (!fallback) return null
    return h('div', { className: 'dotsFallbackHost' },
      h(DotsPage, { t: translate, openExternal: open }))
  } : DotsPage
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: PANEL_ID, locale: NAMESPACE,
    inject: () => ({ t, openExternal }),
  }, MainEntry))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: PANEL_ID, order: 25, locale: NAMESPACE, label: () => t('panel'),
  }, DotsSidebarIcon))
}

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
  mcpStep2: '2. 打开下方 Tunnel 创建页面。Name 填 DSH-Dots，Description 填 Connect ChatGPT Dot to DeepSeek Harness，选择自己的组织和工作区；普通个人连接保持 Restrict client network access 不勾选（组织配置按管理员要求）。创建后复制完整 Tunnel ID，并在 Runtime API Keys 页面准备运行密钥。',
  mcpStep3: '3. 在下方选择客户端安装目录，点击“下载并安装官方客户端”，或填写已有客户端路径。填入 Tunnel ID 和 Runtime API Key，点击“启动隧道”，再用“刷新隧道状态”检查连接。已有 HTTPS 转发可直接填写上方地址，无需运行隧道。',
  mcpStep4: '4. 在 ChatGPT 网页版打开 Plugins → ＋ / Add → Add custom MCP server。Connection 选择 Tunnel 并填入 Tunnel ID（或选择 Server URL 并填写完整 HTTPS 地址）；Authentication 选 No authentication。阅读官方提示，勾选 I understand and want to continue，点击 Create as a plugin，然后在个人 Plugins 中安装。',
  mcpStep5: '5. 在 Dot → Customize → Plugins 中启用连接，先调用 dsh_status，再列出 DSH 会话。当前页面的“刷新状态”可查看收到的实际 MCP 工具调用。',
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
  mcpStep2: '2. Open Tunnel settings below. Use DSH-Dots as Name and Connect ChatGPT Dot to DeepSeek Harness as Description; select your organization/workspace. Leave Restrict client network access unchecked for this personal setup, or follow your organization policy. Copy the full Tunnel ID and obtain a runtime key from Runtime API Keys.',
  mcpStep3: '3. Choose an installation directory below and download the official client, or enter an existing executable. Enter Tunnel ID and Runtime API Key, start the tunnel, then refresh its status. Existing HTTPS forwarding can use the URL above without a tunnel.',
  mcpStep4: '4. In ChatGPT web, open Plugins → ＋ / Add → Add custom MCP server. Select Tunnel and its Tunnel ID (or Server URL and the full HTTPS endpoint). Choose No authentication, acknowledge I understand and want to continue, select Create as a plugin, then install it under Personal plugins.',
  mcpStep5: '5. Enable the connection under Dot → Customize → Plugins, call dsh_status and list DSH sessions. Refresh status on this page to inspect received MCP tool calls.',
  mcpOffHelp: 'Turning MCP off stops the connection without actively cancelling accepted DSH session tasks. Your mobile Dot uses the same configured connection; keep DSH and the tunnel running.',
  mcpRegistration: 'Official MCP registration guide', mcpTunnel: 'Official Secure MCP Tunnel guide', mcpTunnelSettings: 'Official tunnel settings and download', mcpDotGuide: 'Official Dot and plugins guide',
})

function DotsMcpSettings({ t, mcpRpc, tunnelRpc }) {
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
    h('p', { 'data-testid': 'dots-mcp-state' }, !status ? t('mcpLoading') : status.running ? t('mcpRunning') : !status.enabled ? t('mcpOff') : status.error ? t('mcpError') : t('mcpOff')),
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
    tunnelRpc ? h(DotsTunnelSettings, { t, tunnelRpc, mcpRunning: status?.running === true }) : null,
    h('div', { className: 'dotsMcpLinks' }, link('mcpRegistration', t('mcpOff') === zh.mcpOff ? guides.registrationZh : guides.registration),
      link('mcpTunnel', guides.tunnel), link('mcpTunnelSettings', guides.tunnelSettings), link('mcpDotGuide', guides.dots)),
    h('details', null, h('summary', null, `${t('mcpTools')} (${status?.tools?.length ?? 0})`),
      ...(status?.tools ?? []).map(tool => h('p', { key: tool.name }, h('code', null, tool.name), ' — ', tool.description))))
}
exports.DotsMcpSettings = DotsMcpSettings

/** Native Dots settings for the unmodified OpenAI tunnel-client. */
Object.assign(zh, {
  tunnelTitle: 'OpenAI Secure MCP Tunnel', tunnelInstallDir: '客户端安装目录', tunnelPick: '选择目录',
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
  tunnelTitle: 'OpenAI Secure MCP Tunnel', tunnelInstallDir: 'Client installation directory', tunnelPick: 'Choose directory',
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
  const field = (label, value, set, props = {}) => h('label', { className: 'dotsMcpField' }, t(label),
    h('input', { value, type: 'text', disabled: busy, spellCheck: false, onChange: event => set(event.target.value), ...props }))
  const button = (label, action, fields, disabled = false) => h('button', { type: 'button', className: 'dotsMcpButton',
    disabled: action === 'stop' ? false : busy || disabled, onClick: () => { void act(action, fields) } }, t(label))
  const official = status?.links ?? {
    settings: 'https://platform.openai.com/settings/organization/tunnels', keys: 'https://platform.openai.com/settings/organization/api-keys',
    download: 'https://github.com/openai/tunnel-client/releases/latest',
  }
  return h('section', { className: 'dotsTunnelSettings', 'data-testid': 'dots-tunnel-settings' },
    h('h4', null, t('tunnelTitle')),
    h('p', null, t('tunnelHint')),
    h('div', { className: 'dotsMcpLinks' },
      ...[['tunnelPlatform', official.settings], ['tunnelKeys', official.keys], ['tunnelDownload', official.download]]
        .map(([label, href]) => h('a', { key: label, href, target: '_blank', rel: 'noopener noreferrer' }, t(label)))),
    field('tunnelInstallDir', directory, setDirectory),
    typeof window === 'object' && typeof window.__DSH_DIRECTORY_PICKER__?.pick === 'function'
      ? h('button', { type: 'button', className: 'dotsMcpButton', disabled: busy, onClick: () => { void choose() } }, t('tunnelPick')) : null,
    field('tunnelExecutable', executable, setExecutable), h('p', { className: 'dotsMcpHint' }, t('tunnelExisting')),
    button('tunnelInstall', 'install', true),
    h('p', { className: 'dotsMcpHint' }, t('tunnelInstallHint')),
    h('p', { 'data-testid': 'dots-tunnel-installed' }, status?.installed ? t('tunnelInstalled') : t('tunnelMissing')),
    field('tunnelId', id, setId, { placeholder: 'tunnel_…' }),
    field('tunnelKey', key, setKey, { type: 'password', autoComplete: 'off', placeholder: status?.keyAvailable ? t('tunnelKeySaved') : 'Runtime API Key' }),
    h('p', { className: 'dotsMcpHint' }, t('tunnelKeyHint')),
    h('div', { className: 'dotsMcpRow' }, button('tunnelSave', 'configure', true),
      button('tunnelStart', 'start', true, !mcpRunning), button('tunnelStop', 'stop', false),
      button('tunnelDoctor', 'diagnose', true, !mcpRunning), button('tunnelRefresh', 'refresh', false)),
    !mcpRunning ? h('p', null, t('tunnelMcpOff')) : null,
    h('p', { 'data-testid': 'dots-tunnel-state' }, busy ? t('tunnelBusy') : status?.running ? t('tunnelRunning') : t('tunnelStopped')),
    status?.pendingClientSwitch ? h('p', { role: 'status' }, t('tunnelPendingSwitch')) : null,
    status?.running ? h('p', null, status.health ? t(status.health.ok ? 'tunnelConnected' : 'tunnelNotReady') : t('tunnelNoHealth')) : null,
    (message || status?.error) ? h('p', { role: 'status' }, message || status.error) : null,
    status?.lastDiagnosis || status?.health ? h('details', null, h('summary', null, t('tunnelReport')),
      h('pre', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, JSON.stringify(status.health ?? status.lastDiagnosis, null, 2))) : null)
}
exports.DotsTunnelSettings = DotsTunnelSettings

return module.exports; } });
