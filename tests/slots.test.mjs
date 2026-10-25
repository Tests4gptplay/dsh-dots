import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { loadNativeClient } from './cases/load-native-client.mjs'
import { flatten } from './cases/runtime.mjs'

function render(page, extra = {}) { return flatten(page.runtime.expand(page.runtime.React.createElement(page.main.component, { ...page.props, ...extra }))) }

test('official entry registers a DSH main panel and sidebar icon', async () => {
  const page = await loadNativeClient()
  assert.deepEqual([...page.slots.map(s => s.options.name)].sort(), ['main', 'sidebar.panellist'])
  assert.equal(page.main.options.key, 'dsh-dots')
  assert.equal(page.icon.options.id, 'dsh-dots')
  assert.equal(page.icon.options.label(), 'DSH Dots')
  assert.ok(page.styles[0].textContent.includes('.dotsPage'))
})

test('native SVG ring inherits light/dark theme with currentColor', async () => {
  const page = await loadNativeClient()
  const icon = flatten(page.runtime.expand(page.runtime.React.createElement(page.icon.component, { size: 18 })))
  const ring = icon.find(node => node.type === 'circle')
  assert.equal(ring.props.stroke, 'currentColor')
  assert.equal(ring.props.r, 32)
  assert.equal(ring.props.strokeWidth, 30)
  const svg = (await readFile(new URL('../assets/dots-ring.svg', import.meta.url), 'utf8'))
  assert.match(svg, /prefers-color-scheme: dark/)
})

test('only the official Dots URL appears in the production web frame', async () => {
  const page = await loadNativeClient()
  const nodes = render(page)
  const frame = nodes.find(node => node.type === 'iframe')
  assert.equal(frame.props.src, 'https://chatgpt.com/dots/home')
  assert.match(frame.props.sandbox, /allow-scripts/)
  assert.equal(nodes.some(node => node.props?.['data-testid'] === 'mock-conversation'), false)
  assert.equal(nodes.some(node => node.props?.['data-testid'] === 'mock-badge'), false)
})

test('native DSH browser receives the requested official address', async () => {
  const page = await loadNativeClient()
  const buttons = render(page).filter(node => node.type === 'button')
  buttons[0].props.onClick()
  assert.equal(page.nativeOpened.length, 1)
  assert.equal(page.nativeOpened[0].kind, 'browser')
  assert.equal(page.nativeOpened[0].options.params.url, 'https://chatgpt.com/dots/home')
})

test('missing Browser capability shows fallback, never pretends login succeeded', async () => {
  let scheduled = false
  const page = await loadNativeClient({ browserAvailable: false, onUpdate() { scheduled = true } })
  render(page).filter(node => node.type === 'button')[0].props.onClick()
  assert.equal(scheduled, false) // queued microtask has not yet run
  await new Promise(resolve => setImmediate(resolve))
  const warning = render(page).find(node => node.props?.role === 'alert')
  assert.match(JSON.stringify(warning), /当前 DSH 浏览器不可用/)
})

test('language defaults to Chinese and English can be selected', async () => {
  const cn = await loadNativeClient({ language: 'zh' })
  const en = await loadNativeClient({ language: 'en' })
  assert.match(JSON.stringify(render(cn)), /网页入口/)
  assert.match(JSON.stringify(render(en)), /web entry/)
})

test('package has no explicit DSH release gate', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  for (const [key, value] of Object.entries(manifest.peerDependencies)) {
    if (key.startsWith('@deepseek-ai/')) assert.equal(value, '*')
  }
  assert.equal(manifest.dsh.client.platform, 'web')
})

test('a DSH profile with Sidebar but without Browser reports unavailable', async () => {
  const page = await loadNativeClient({ browserAvailable: false, registryAvailable: true })
  render(page).filter(node => node.type === 'button')[0].props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(page.nativeOpened.length, 0)
  assert.match(JSON.stringify(render(page).find(node => node.props?.role === 'alert')), /当前 DSH 浏览器不可用/)
})

test('system browser entry targets only the official Dots webpage', async () => {
  const page = await loadNativeClient()
  render(page).filter(node => node.type === 'button')[1].props.onClick()
  assert.equal(page.nativeOpened.filter(x => x.kind === 'external').length, 1)
  assert.doesNotMatch(JSON.stringify(render(page)), /模拟 Dot · 仅供测试/)
})

test('production host contains no account bridging or background task loop', async () => {
  const host = await import('../lib/host.js')
  assert.equal(host.name, 'dsh-dots')
  assert.deepEqual(host.inject, [])
  assert.equal(host.apply(), undefined)
})
