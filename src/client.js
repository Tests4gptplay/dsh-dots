/** Native DSH main panel and sidebar entry. Uses the user's own ChatGPT web login. */
const React = require('react')
const { createElement: h, useState, useRef, useEffect } = React
const NAMESPACE = 'dsh.dotmcp'
const PANEL_ID = 'dsh-dot-mcp'
const DOTS_URL = 'https://chatgpt.com/dots/home'

const zh = {
  panel: 'DSH Dot MCP', title: 'Dots',
  inBrowser: '在浏览器打开', reload: '刷新', back: '后退', home: '返回 Dot 首页',
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
  panel: 'DSH Dot MCP', title: 'Dots',
  inBrowser: 'Open in browser', reload: 'Reload', back: 'Back', home: 'Back to Dot home',
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
function mountDesktopDotGuest(host, bridge, onError, onLoaded, onHistoryChange = () => {}) {
  let disposed = false
  let disposePromise
  let lease
  let guest
  let unsubscribe = () => {}
  let navigated = false
  const safe = work => { if (!disposed) return work() }
  const updateHistory = () => safe(() => {
    let canBack = false
    try { canBack = Boolean(guest?.canGoBack?.()) } catch {}
    onHistoryChange(canBack)
  })
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
      guest.addEventListener('did-navigate', updateHistory)
      guest.addEventListener('did-navigate-in-page', updateHistory)
      guest.addEventListener('did-finish-load', () => safe(() => { onLoaded(); updateHistory() }))
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
    back() { if (guest && navigated && !disposed) {
      try { if (guest.canGoBack?.()) guest.goBack?.() } catch (error) { safe(() => onError(error)) }
    } },
    home() { if (guest && navigated && !disposed) navigate(DOTS_URL) },
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
  let back
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
    const brand = document.createElement('button')
    brand.className = 'dotsBrand'
    brand.setAttribute('type', 'button')
    translate(brand, 'home', 'title')
    translate(brand, 'home', 'aria-label')
    const mark = document.createElement('span')
    mark.className = 'dotsMark'
    mark.setAttribute('aria-hidden', 'true')
    mark.append(ringSvgNode(23))
    const name = document.createElement('span')
    name.className = 'dotsBrandName'
    translate(name, 'title')
    brand.append(mark, name)
    brand.addEventListener('click', () => guest?.home())
    const actions = document.createElement('div')
    actions.className = 'dotsToolbarActions'
    back = document.createElement('button')
    back.className = 'dotsTool dotsBack'
    back.setAttribute('type', 'button')
    back.disabled = true
    translate(back, 'back')
    back.addEventListener('click', () => guest?.back())
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
    actions.append(back, reload, open)
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
    guest = mountDesktopDotGuest(host, bridge, () => setError('guestFailed'), () => setError(''), canGoBack => { back.disabled = !canGoBack })
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

function DotsWebSurface({ reloadCount, homeCount, backCount, onHistoryChange, onFailure, onLoaded, t }) {
  const container = useRef(null)
  const owner = useRef(null)
  const bridge = desktopBrowserBridge()
  useEffect(() => {
    if (!bridge || !container.current) return
    const mounted = mountDesktopDotGuest(container.current, bridge,
      () => onFailure(t('guestFailed')), onLoaded, onHistoryChange)
    owner.current = mounted
    return () => { owner.current = null; disposeDesktopGuest(mounted) }
  }, [bridge])
  useEffect(() => {
    if (reloadCount > 0 && bridge) owner.current?.reload()
  }, [reloadCount, bridge])
  useEffect(() => {
    if (homeCount > 0 && bridge) owner.current?.home()
  }, [homeCount, bridge])
  useEffect(() => {
    if (backCount > 0 && bridge) owner.current?.back()
  }, [backCount, bridge])
  return bridge
    ? h('div', { ref: container, className: 'dotsGuestHost', 'data-testid': 'dots-desktop-webview-host' })
    : h('iframe', { key: `${reloadCount}:${homeCount}`, className: 'dotsWebFrame', title: 'ChatGPT Dots',
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
  const [homeCount, setHomeCount] = useState(0)
  const [backCount, setBackCount] = useState(0)
  const [canGoBack, setCanGoBack] = useState(false)
  const [error, setError] = useState('')
  const launchExternal = () => {
    try { setError(openExternal() === false ? 'openFailed' : '') }
    catch { setError('openFailed') }
  }
  return h('main', { className: 'dotsPage', 'aria-label': 'DSH Dots' },
    h('header', { className: 'dotsToolbar' },
      h('button', { className: 'dotsBrand', type: 'button', title: t('home'),
        'aria-label': t('home'), onClick: () => setHomeCount(n => n + 1) },
        h('span', { className: 'dotsMark', 'aria-hidden': 'true' }, h(RingIcon, { size: 23 })),
        h('span', { className: 'dotsBrandName' }, t('title'))),
      h('div', { className: 'dotsToolbarActions' },
        h('button', { className: 'dotsTool dotsBack', type: 'button', disabled: !canGoBack,
          onClick: () => setBackCount(n => n + 1) }, t('back')),
        h('button', { className: 'dotsTool', type: 'button', onClick: () => setReloadCount(n => n + 1) }, t('reload')),
        h('button', { className: 'dotsTool dotsOpen', type: 'button', onClick: launchExternal, title: t('fallback') }, t('inBrowser')))),
    h('section', { className: 'dotsContent', 'data-testid': 'dots-native-content' },
      h(DotsWebSurface, { reloadCount, homeCount, backCount, onHistoryChange: setCanGoBack, onFailure: () => setError('guestFailed'), onLoaded: () => setError(''), t }),
      error ? h('div', { className: 'dotsEmbedNotice', role: 'alert' },
        h('span', null, t(error)),
        h('button', { className: 'dotsTool dotsOpen', type: 'button', onClick: launchExternal }, t('inBrowser'))) : null))
}


/** DSH Settings section: maintenance stays outside the Dots main page and Plugins page. */
function DotsPersistenceSettings({ t, rpc, mcpRpc, tunnelRpc, notifyRpc, desktop = true }) {
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
    type: 'button', className: 'dotsMcpButton', disabled: busy || !enabled, onClick: action,
  }, t(key))
  const persistence = h('section', { 'data-testid': 'dots-persistence-settings', className: 'dotsSettingsCard' },
    h('div', { className: 'dotsCardHeader' }, h('h3', null, t('persistenceTitle'))),
    h('p', { className: 'dotsCardIntro' }, t('persistenceDescription')),
    h('p', { className: 'dotsStatus', 'data-testid': 'dots-persistence-status' }, summary),
    status?.archive ? h('p', { style: { overflowWrap: 'anywhere', opacity: .7, fontSize: 12 } },
      t('persistencePath') + ': ' + status.archive) : null,
    h('div', { className: 'dotsMcpRow dotsActions' },
      button('persistenceCheck', () => { setMessage(''); void check().catch(error => setMessage(t('persistenceError') + String(error.message || error))) }),
      button('persistenceApply', () => { void act('apply') }, state === 'available'),
      button('persistenceRestore', () => { void act('restore') }, state === 'applied' && status?.canRestore === true)),
    message ? h('p', { role: 'status' }, message) : null)
  return h('div', { className: 'dotsSettings' }, desktop ? persistence : null, mcpRpc ? h(DotsMcpSettings, { t, mcpRpc, tunnelRpc, notifyRpc }) : null)
}

exports.name = 'dsh-dot-mcp-client'
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
  ctx.effect(() => ctx.locale.register(NAMESPACE, { zh, en }), 'dsh-dot-mcp.localization')
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dshDots = 'client'
    style.textContent = __DOTS_CLIENT_CSS__
    document.head.append(style)
    return () => style.remove()
  }, 'dsh-dot-mcp.style')
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
      const response = await connection.rpc.call('/api', 'dsh-dot-mcp-persistence/' + endpoint, {}, signal)
      if (!response?.ok) throw new Error(response?.error?.message || 'Dots persistence request failed')
      return response.value
    }
    const mcpRpc = async (endpoint, payload = {}, signal) => {
      const connection = ctx.get?.('connection') ?? ctx.connection
      if (!connection?.rpc) throw new Error('DSH connection is not available')
      const response = await connection.rpc.call('/api', 'dsh-dot-mcp-mcp/' + endpoint, payload, signal)
      if (!response?.ok) throw new Error(response?.error?.message || 'Dots MCP request failed')
      return response.value
    }
    const notifyRpc = async (endpoint, payload = {}, signal) => {
      const connection = ctx.get?.('connection') ?? ctx.connection
      if (!connection?.rpc) throw new Error('DSH connection is not available')
      const response = await connection.rpc.call('/api', 'dsh-dot-mcp-notify/' + endpoint, payload, signal)
      if (!response?.ok) throw new Error(response?.error?.message || 'Dots notification request failed')
      return response.value
    }
    const tunnelRpc = async (endpoint, payload = {}, signal) => {
      const connection = ctx.get?.('connection') ?? ctx.connection
      if (!connection?.rpc) throw new Error('DSH connection is not available')
      const response = await connection.rpc.call('/api', 'dsh-dot-mcp-tunnel/' + endpoint, payload, signal)
      if (!response?.ok) throw new Error(response?.error?.message || 'Tunnel request failed')
      return response.value
    }
    ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section', id: 'dsh-dot-mcp-settings', order: 25,
      locale: NAMESPACE, label: () => t('persistenceNav'), inject: () => ({ t, rpc, mcpRpc, tunnelRpc, notifyRpc, desktop: persistent }),
    }, DotsPersistenceSettings))
  }
  let persistentPage
  ctx.effect(() => {
    if (!persistent) return
    persistentPage = mountPersistentDotsPage(desktopBrowserBridge(), t, openExternal)
    const unsubscribe = ctx.locale.subscribe(() => persistentPage?.refreshLocale())
    return () => { unsubscribe(); persistentPage?.dispose() }
  }, 'dsh-dot-mcp.preload')
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
