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
}
const en = {
  panel: 'DSH Dots', title: 'Dots',
  inBrowser: 'Open in browser', reload: 'Reload',
  openFailed: 'Could not open the site. Open ChatGPT Dots in your system browser.',
  guestFailed: 'The DSH Desktop web carrier could not start. Open in your browser.',
  guestLoading: 'Connecting to Dots…',
  fallback: 'If the Dot page is blank, open it in your browser.',
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
  const isVisible = () => {
    if (!page || !page.isConnected) return false
    if (typeof getComputedStyle === 'function' && getComputedStyle(page).display === 'none') return false
    if (typeof page.getBoundingClientRect !== 'function') return true
    return page.getBoundingClientRect().height > 0
  }
  return {
    attach, show, hide, isVisible, refreshLocale,
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
