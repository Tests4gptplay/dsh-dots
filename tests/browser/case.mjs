import { createTestReact } from '../cases/runtime.mjs'
import { createMockDotBackend } from '../cases/mock-dots-backend.mjs'

const backend = createMockDotBackend()
let requestUpdate = () => {}
const runtime = createTestReact(() => requestUpdate())
let client
const registrations = new Map()
let dictionaries = null
window.__ModuleLoader__ = { load({ id, factory }) {
  if (id !== 'dsh-dots') throw Error(`Unexpected module ${id}`)
  client = factory(specifier => {
    if (specifier === 'react') return runtime.React
    throw Error(`Unexpected dependency ${specifier}`)
  })
} }
// Load the same compiled plugin client bundle delivered to DSH; no separate UI mock.
await new Promise((resolve, reject) => {
  const element = document.createElement('script')
  element.src = '/lib/client.js'
  element.onload = resolve
  element.onerror = reject
  document.head.append(element)
})
const ctx = {
  effect(work) { work() },
  locale: {
    register(_namespace, entries) { dictionaries = entries },
    bind() { return (key) => dictionaries.zh[key] ?? key },
  },
  slots: {
    inject(_name, add) { add() },
    register(options, component) { registrations.set(options.name, { options, component }); return () => {} },
  },
  get(_name) { return undefined },
}
client.apply(ctx)

function nodeToDom(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return document.createTextNode('')
  if (Array.isArray(node)) {
    const fragment = document.createDocumentFragment()
    node.forEach(child => fragment.append(nodeToDom(child)))
    return fragment
  }
  if (typeof node !== 'object') return document.createTextNode(String(node))
  const dom = ['svg', 'circle'].includes(node.type)
    ? document.createElementNS('http://www.w3.org/2000/svg', node.type)
    : document.createElement(node.type)
  const props = node.props ?? {}
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'key' || value == null) continue
    if (key === 'className') { dom.className = value; continue }
    if (key === 'style' && value && typeof value === 'object') {
      Object.assign(dom.style, value); continue
    }
    if (key === 'onChange') { dom.addEventListener('input', value); continue }
    if (key.startsWith('on')) { dom.addEventListener(key.slice(2).toLowerCase(), value); continue }
    if (typeof value === 'boolean') { if (value) dom.setAttribute(key, ''); continue }
    if (key === 'strokeWidth') dom.setAttribute('stroke-width', String(value))
    else dom.setAttribute(key, String(value))
  }
  if (node.type === 'input' && typeof props.value === 'string') dom.value = props.value
  if (props.children !== undefined) dom.append(nodeToDom(props.children))
  return dom
}
function paint() {
  const main = registrations.get('main')
  const frame = runtime.React.createElement(main.component, {
    ...main.options.inject(), __testDotsBackend: backend,
  })
  document.querySelector('#app').replaceChildren(nodeToDom(runtime.expand(frame)))
  const sidebar = registrations.get('sidebar.panellist')
  document.querySelector('#sidebar-icon').replaceChildren(nodeToDom(runtime.expand(runtime.React.createElement(sidebar.component, { size: 28 }), 'sidebar')))
}
let framePending = false
requestUpdate = () => {
  if (framePending) return
  framePending = true
  queueMicrotask(() => { framePending = false; paint() })
}
paint()
window.__dshDotsCase = { mock: true, getCallCount: () => backend.calls, refresh: () => paint() }
document.querySelector('#theme-toggle').addEventListener('click', () => document.body.classList.toggle('dark'))
