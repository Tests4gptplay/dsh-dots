import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { createTestReact } from './runtime.mjs'

/** Minimal DOM node double: enough for append/remove/attributes/listeners. */
function createNode(tag, created) {
  const events = new Map()
  const node = {
    tag, style: {}, children: [], parentElement: null, dataset: {}, textContent: '', isConnected: true,
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 } },
    attrs: {}, navigations: [], reloads: 0, removed: false,
    setAttribute(k, v) { this.attrs[k] = v },
    addEventListener(k, fn) { events.set(k, fn) },
    emit(k, event = {}) { events.get(k)?.(event) },
    append(...values) {
      for (const value of values) {
        if (value && typeof value === 'object') value.parentElement = this
        this.children.push(value)
      }
    },
    remove() {
      this.removed = true
      if (this.parentElement) {
        this.parentElement.children = this.parentElement.children.filter(child => child !== this)
        this.parentElement = null
      }
    },
    loadURL(url) { this.navigations.push(url); return Promise.resolve() },
    reload() { this.reloads++ },
  }
  created.push(node)
  return node
}

/** Executes the actual production client bundle behind a fake DSH Slot Host. */
export async function loadNativeClient({ language = 'zh', browserAvailable = true, registryAvailable = true, desktopBridge, onUpdate } = {}) {
  const runtime = createTestReact(onUpdate)
  const slots = []
  let dictionaries = {}
  let nativeOpened = []
  const styles = []
  const created = []
  const disposers = []
  const bodyChildren = []
  const windowEvents = new Map()
  const panelListeners = new Set()
  const localeListeners = new Set()
  let activePanelId = null
  const layout = { panelInfo: {
    getSnapshot: () => ({ activePanelId }),
    subscribe(fn) { panelListeners.add(fn); return () => panelListeners.delete(fn) },
  } }
  const column = createNode('div', created)
  const outlet = createNode('div', created)
  column.append(outlet)
  const browser = browserAvailable ? { openTab: (kind, options) => {
    nativeOpened.push({ kind, options })
  } } : undefined
  let client
  const sandbox = {
    URL,
    getComputedStyle(node) { return { display: node.style.display || 'block' } },
    ResizeObserver: class { observe() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    window: {
      addEventListener(k, fn) { windowEvents.set(k, fn) },
      removeEventListener(k) { windowEvents.delete(k) },
      dshDesktop: desktopBridge,
      __ModuleLoader__: { load({ id, factory }) { if (id !== 'dsh-dots') throw new Error('Wrong module'); client = factory(id => {
        if (id === 'react') return runtime.React
        throw new Error(`Unexpected dependency ${id}`)
      }) } },
      open() { nativeOpened.push({ kind: 'external' }) },
    },
    document: {
      createElement(tag) { return createNode(tag, created) },
      createElementNS(_ns, tag) { return createNode(tag, created) },
      querySelector(selector) { return selector === '[data-slot="main"]' ? outlet : null },
      head: { append(value) { styles.push(value) } },
      body: { append(value) { bodyChildren.push(value) } },
    },
    console, queueMicrotask,
  }
  const compiled = await readFile(new URL('../../lib/client.js', import.meta.url), 'utf8')
  vm.runInNewContext(compiled, sandbox, { filename: 'lib/client.js' })
  const ctx = {
    layout,
    effect(callback) { const dispose = callback(); if (typeof dispose === 'function') disposers.push(dispose) },
    locale: {
      subscribe(fn) { localeListeners.add(fn); return () => localeListeners.delete(fn) },
      register(namespace, entries) { dictionaries[namespace] = entries },
      bind(namespace) { return (key) => dictionaries[namespace]?.[language]?.[key] ?? key },
    },
    slots: {
      inject(_name, register) { register() },
      register(options, component) { slots.push({ options, component }); return () => {} },
    },
    get(name) {
      if (name === 'layout') return layout
      if (name === 'sidebarRight') return browser
      if (name === 'sidebarRightTabs' && registryAvailable) return { get: kind => kind === 'browser' && browserAvailable ? { id: 'builtin-browser' } : undefined }
      return undefined
    },
  }
  client.apply(ctx)
  const main = slots.find(slot => slot.options.name === 'main')
  const icon = slots.find(slot => slot.options.name === 'sidebar.panellist')
  const root = column.children.find(child => child.className?.includes('dotsPersistentPage'))
  return { client, runtime, slots, styles, main, icon, nativeOpened, props: main.options.inject(), created,
    bodyChildren, windowEvents, centerChildren: column.children, root, panelListeners,
    localeListeners,
    setLanguage(value) { language = value; for (const fn of localeListeners) fn() },
    selectPanel(id) { activePanelId = id; for (const fn of panelListeners) fn() },
    async dispose() { for (const dispose of disposers.reverse()) await dispose() } }
}

export function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined
  if (predicate(node)) return node
  for (const child of node.children ?? []) {
    const hit = find(child, predicate)
    if (hit) return hit
  }
  return undefined
}
