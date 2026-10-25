import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { loadNativeClient } from './cases/load-native-client.mjs'
import { flatten } from './cases/runtime.mjs'

function render(page, extra = {}) { return flatten(page.runtime.expand(page.runtime.React.createElement(page.main.component, { ...page.props, ...extra }))) }

test('official entry registers only a DSH main panel and sidebar icon', async () => {
  const page = await loadNativeClient()
  assert.deepEqual([...page.slots.map(s => s.options.name)].sort(), ['main', 'sidebar.panellist'])
  assert.equal(page.main.options.key, 'dsh-dots')
  assert.equal(page.icon.options.id, 'dsh-dots')
  assert.equal(page.icon.options.label(), 'DSH Dots')
  assert.ok(page.styles[0].textContent.includes('.dotsPage'))
})

test('native ring icon inherits DSH theme through currentColor', async () => {
  const page = await loadNativeClient()
  const nodes = flatten(page.runtime.expand(page.runtime.React.createElement(page.icon.component, { size: 18 })))
  const ring = nodes.find(node => node.type === 'circle')
  assert.equal(ring.props.stroke, 'currentColor')
  assert.equal(ring.props.r, 32)
  const svg = (await readFile(new URL('../assets/dots-ring.svg', import.meta.url), 'utf8'))
  assert.match(svg, /prefers-color-scheme: dark/)
})

test('production page has a full-bleed DSH content surface, not a framed browser', async () => {
  const page = await loadNativeClient()
  const nodes = render(page)
  const surface = nodes.find(n => n.props?.['data-testid'] === 'dots-native-content')
  const frame = nodes.find(node => node.type === 'iframe')
  assert.ok(surface)
  assert.equal(frame.props.src, 'https://chatgpt.com/dots/home')
  assert.match(frame.props.sandbox, /allow-scripts/)
  assert.equal(nodes.some(n => n.props?.className === 'dotsFrameWrap'), false)
  assert.equal(nodes.some(n => n.props?.className === 'dotsBanner'), false)
  const buttons = nodes.filter(n => n.type === 'button')
  assert.equal(buttons.length, 2)
  assert.match(JSON.stringify(buttons), /在浏览器打开/)
})

test('the old unavailable right-sidebar browser action is not present', async () => {
  const page = await loadNativeClient({ browserAvailable: false, registryAvailable: false })
  const nodes = render(page)
  assert.equal(nodes.some(n => typeof n.props?.children === 'string' && n.props.children.includes('DSH 浏览器')), false)
  assert.equal(nodes.some(n => n.props?.role === 'alert'), false)
  nodes.filter(n => n.type === 'button')[1].props.onClick()
  assert.equal(page.nativeOpened.filter(x => x.kind === 'external').length, 1)
  assert.equal(page.nativeOpened.filter(x => x.kind === 'browser').length, 0)
})

test('language defaults to Chinese and English can be selected', async () => {
  const cn = await loadNativeClient({ language: 'zh' })
  const en = await loadNativeClient({ language: 'en' })
  assert.match(JSON.stringify(render(cn)), /在浏览器打开/)
  assert.match(JSON.stringify(render(en)), /Open in browser/)
})

test('package has no explicit DSH release gate', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  for (const [key, value] of Object.entries(manifest.peerDependencies)) {
    if (key.startsWith('@deepseek-ai/')) assert.equal(value, '*')
  }
  assert.equal(manifest.engines, undefined, 'Installation should use the host runtime without a Node version gate')
  assert.equal(manifest.dsh.client.platform, 'web')
})

test('full-bleed Dots main panel does not depend on any sidebar session Browser', async () => {
  const page = await loadNativeClient({ browserAvailable: false, registryAvailable: false })
  const nodes = render(page)
  assert.ok(nodes.some(node => node.props?.['data-testid'] === 'dots-native-content'))
  assert.equal(nodes.some(node => node.props?.role === 'alert'), false)
  assert.equal(page.nativeOpened.length, 0)
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
