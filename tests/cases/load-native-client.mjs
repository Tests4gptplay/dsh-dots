import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { createTestReact } from './runtime.mjs'

/** Executes the actual production client bundle behind a fake DSH Slot Host. */
export async function loadNativeClient({ language = 'zh', browserAvailable = true, registryAvailable = true, desktopBridge, onUpdate } = {}) {
  const runtime = createTestReact(onUpdate)
  const slots = []
  let dictionaries = {}
  let nativeOpened = []
  const styles = []
  const created = []
  const browser = browserAvailable ? { openTab: (kind, options) => {
    nativeOpened.push({ kind, options })
  } } : undefined
  let client
  const sandbox = {
    URL,
    window: { dshDesktop: desktopBridge, __ModuleLoader__: { load({ id, factory }) { if (id !== 'dsh-dots') throw new Error('Wrong module'); client = factory(id => {
      if (id === 'react') return runtime.React
      throw new Error(`Unexpected dependency ${id}`)
    }) } }, open() { nativeOpened.push({ kind: 'external' }) } },
    document: {
      head: { append(value) { styles.push(value) } },
      createElement(tag) {
        const events = new Map()
        const node = { tag, dataset: {}, textContent: '', attrs: {}, navigations: [], reloads: 0, removed: false,
          setAttribute(k,v) { this.attrs[k] = v },
          addEventListener(k,fn) { events.set(k, fn) },
          emit(k,event={}) { events.get(k)?.(event) },
          loadURL(url) { this.navigations.push(url); return Promise.resolve() },
          reload() { this.reloads++ },
          remove() { this.removed = true },
        }
        created.push(node)
        return node
      },
    },
    console, queueMicrotask,
  }
  const compiled = await readFile(new URL('../../lib/client.js', import.meta.url), 'utf8')
  vm.runInNewContext(compiled, sandbox, { filename: 'lib/client.js' })
  const ctx = {
    effect(callback) { callback() },
    locale: {
      register(namespace, entries) { dictionaries[namespace] = entries },
      bind(namespace) { return (key) => dictionaries[namespace]?.[language]?.[key] ?? key },
    },
    slots: {
      inject(_name, register) { register() },
      register(options, component) { slots.push({ options, component }); return () => {} },
    },
    get(name) {
      if (name === 'sidebarRight') return browser
      if (name === 'sidebarRightTabs' && registryAvailable) return { get: kind => kind === 'browser' && browserAvailable ? { id: 'builtin-browser' } : undefined }
      return undefined
    },
  }
  client.apply(ctx)
  const main = slots.find(slot => slot.options.name === 'main')
  const icon = slots.find(slot => slot.options.name === 'sidebar.panellist')
  return { client, runtime, slots, styles, main, icon, nativeOpened, props: main.options.inject(), created } 
}
