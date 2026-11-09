import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadNativeClient } from './cases/load-native-client.mjs'
import { flatten } from './cases/runtime.mjs'
import { registerPersistenceTransport } from '../src/host.mjs'

function setup(value) {
  const calls = []
  let state = value
  const connection = { rpc: { async call(_path, method, data) {
    calls.push({ method, data })
    if (method.endsWith('/status')) return { ok: true, value: state }
    if (method.endsWith('/apply')) { state = { state: 'applied', canRestore: true, archive: '/test/app.asar', changed: true }; return { ok: true, value: state } }
    if (method.endsWith('/restore')) { state = { state: 'available', canRestore: false, archive: '/test/app.asar', changed: true }; return { ok: true, value: state } }
    throw new Error('unknown method')
  } } }
  const browser = { acquire: async () => ({ partition: 'partition', lease: 'lease' }), release: async () => {} }
  return { connection, desktopBridge: { browser }, calls }
}
function sectionOf(page) { return page.slots.find(s => s.options.name === 'settings.section') }
function flattenSection(page) {
  const slot = sectionOf(page)
  return flatten(page.runtime.expand(page.runtime.React.createElement(slot.component, slot.options.inject())))
}
const tick = () => new Promise(resolve => setImmediate(resolve))

test('Dots persistence section is registered in DSH Settings (not Plugins or the Dots main page)', async () => {
  const opts = setup({ state: 'available', canRestore: false, archive: '/test/app.asar' })
  const page = await loadNativeClient(opts)
  assert.equal(page.slots.some(s => s.options.name === 'settings.plugins.tab'), false)
  assert.equal(page.slots.filter(s => s.options.name === 'settings.section').length, 1)
  assert.equal(sectionOf(page).options.label(), 'Dots 登录保持')
  assert.equal(page.main.options.key, 'dsh-dots')
  assert.equal(page.icon.options.id, 'dsh-dots')
  const nodes = flattenSection(page)
  assert.equal(nodes.some(n => n.props?.['data-testid'] === 'dots-persistence-settings'), true)
  assert.equal(nodes.some(n => n.type === 'button' && n.props?.children === '一键应用'), true)
  assert.equal(nodes.some(n => n.type === 'button' && n.props?.children === '恢复原版'), true)
  await page.dispose()
})

test('Web profile keeps only main panel + sidebar; no Desktop repair action', async () => {
  const page = await loadNativeClient({ connection: setup({}).connection })
  assert.equal(sectionOf(page), undefined)
  assert.deepEqual(page.slots.map(s => s.options.name).sort(), ['main', 'sidebar.panellist'])
  await page.dispose()
})

test('Settings action uses authenticated DSH RPC endpoints rather than renderer filesystem access', async () => {
  const opts = setup({ state: 'available', archive: '/test/app.asar', canRestore: false })
  const page = await loadNativeClient(opts)
  const slot = sectionOf(page)
  page.runtime.mount(slot.component, slot.options.inject())
  await tick()
  let nodes = flatten(page.runtime.mount(slot.component, slot.options.inject()))
  let apply = nodes.find(n => n.type === 'button' && n.props?.children === '一键应用')
  assert.equal(apply.props.disabled, false)
  apply.props.onClick()
  await tick()
  assert.equal(opts.calls.some(x => x.method === 'dsh-dots-persistence/apply'), true)
  nodes = flatten(page.runtime.mount(slot.component, slot.options.inject()))
  const restored = nodes.find(n => n.type === 'button' && n.props?.children === '恢复原版')
  assert.equal(restored.props.disabled, false)
  restored.props.onClick()
  await tick()
  assert.equal(opts.calls.some(x => x.method === 'dsh-dots-persistence/restore'), true)
  page.runtime.unmount()
  await page.dispose()
})

test('Host registers exactly three authenticated DSH endpoints, no new listening server', async () => {
  const endpoints = new Map()
  const connection = { fetch: { register(opts) {
    endpoints.set(opts.path, opts)
    return async () => { endpoints.delete(opts.path) }
  } } }
  const events = []
  const service = {
    async inspect() { events.push('inspect'); return { state: 'available' } },
    async applyPersistence() { events.push('apply'); return { state: 'applied' } },
    async restorePersistence() { events.push('restore'); return { state: 'available' } },
  }
  const dispose = registerPersistenceTransport(connection, service)
  assert.deepEqual([...endpoints.keys()].sort(), ['status','apply','restore'].map(s => `/api/dsh-dots-persistence/${s}`).sort())
  for (const method of ['status','apply','restore']) {
    const url = `/api/dsh-dots-persistence/${method}`
    const request = new Request('http://localhost'+url,{ method:'POST', headers: { 'content-type':'application/json' },
      body: JSON.stringify({ type: 'client-request', method:`dsh-dots-persistence/${method}`, rpcId:method, payload:{} }) })
    const response = await endpoints.get(url).fetch(request)
    const result = await response.json()
    assert.equal(result.result.ok,true)
    assert.equal(result.rpcId,method)
  }
  assert.deepEqual(events, ['inspect','apply','restore'])
  await dispose()
  assert.equal(endpoints.size,0)
})
