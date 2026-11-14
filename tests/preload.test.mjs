import test from 'node:test'
import assert from 'node:assert/strict'
import { loadNativeClient, find } from './cases/load-native-client.mjs'
const tick = () => new Promise(resolve => setImmediate(resolve))

test('startup keeps one page inside the native center column, never in a body overlay', async () => {
  const calls = { acquire: 0, release: 0 }
  const bridge = {
    async acquire() { calls.acquire++; return { lease: 'preloaded', partition: 'persist:dsh-dots-personal-browser' } },
    async release() { calls.release++ },
  }
  const page = await loadNativeClient({ desktopBridge: { browser: bridge } })
  await tick()
  const view = page.created.find(node => node.tag === 'webview')
  assert.equal(page.bodyChildren.length, 0)
  assert.equal(calls.acquire, 1)
  assert.ok(page.root, 'persistent page is mounted in the center column')
  assert.equal(page.centerChildren.includes(page.root), true)
  assert.equal(page.root.style.display, 'none', 'preloaded but hidden until the panel is selected')
  assert.equal(page.root.style.position, undefined, 'normal flex layout, not an overlay')
  assert.equal(view.parentElement.className, 'dotsGuestHost')
  view.emit('dom-ready')
  await tick()
  assert.deepEqual(view.navigations, ['https://chatgpt.com/dots/home'])

  page.runtime.mount(page.main.component, page.props)
  assert.equal(page.root.style.display, 'flex', 'selecting the panel shows the existing page')
  page.runtime.unmount()
  assert.equal(page.root.style.display, 'none', 'leaving the panel only hides it')
  page.runtime.mount(page.main.component, page.props)
  assert.equal(page.root.style.display, 'flex')
  assert.equal(calls.acquire, 1, 'one guest for the whole plugin lifetime')
  assert.equal(view.navigations.length, 1, 'panel switches do not navigate again')
  assert.equal(view.reloads, 0, 'panel switches do not reload')

  const back = find(page.root, node => node.className === 'dotsTool dotsBack')
  const brand = find(page.root, node => node.className === 'dotsBrand')
  assert.equal(back.disabled, true, 'back starts disabled on Dot home')
  view.canGoBack = () => true
  let backCalls = 0
  view.goBack = () => { backCalls++ }
  view.emit('did-navigate')
  assert.equal(back.disabled, false)
  back.emit('click')
  assert.equal(backCalls, 1)
  brand.emit('click')
  await tick()
  assert.equal(view.navigations.at(-1), 'https://chatgpt.com/dots/home')
  assert.equal(calls.acquire, 1, 'navigation reuses the same preloaded guest')
  find(page.root, node => node.className === 'dotsTool dotsReload').emit('click')
  assert.equal(view.reloads, 1, 'the toolbar refresh explicitly reloads the page')

  await page.dispose()
  assert.equal(calls.release, 1)
  assert.equal(view.removed, true)
  assert.equal(page.root.removed, true)
  assert.equal(page.panelListeners.size, 0)
})

test('the selected native slot does not render a second page', async () => {
  const bridge = { acquire: async () => ({}), release: async () => {} }
  const page = await loadNativeClient({ desktopBridge: { browser: bridge } })
  await tick()
  assert.equal(page.runtime.mount(page.main.component, page.props), null, 'no fallback when the persistent page is visible')
  assert.equal(page.created.filter(node => node.tag === 'webview').length, 1)
  await page.dispose()
})

test('Web profile keeps the original main-panel iframe', async () => {
  const page = await loadNativeClient()
  assert.equal(page.main.component, page.client.DotsPage)
  assert.equal(page.root, undefined)
  assert.equal(page.created.filter(node => node.tag === 'webview').length, 0)
  await page.dispose()
})

test('a temporarily zero-height Dots panel preserves its preloaded guest', async () => {
  const calls = { release: 0 }
  const bridge = {
    async acquire() { return { lease: 'transient', partition: 'dots' } },
    async release() { calls.release++ },
  }
  const page = await loadNativeClient({ desktopBridge: { browser: bridge } })
  await tick()
  const view = page.created.find(node => node.tag === 'webview')
  page.root.getBoundingClientRect = () => ({ width: 800, height: 0 })
  page.runtime.mount(page.main.component, page.props)
  assert.equal(view.removed, false, 'layout timing must not destroy the guest')
  assert.equal(calls.release, 0, 'zero height is not a failed guest')
  assert.equal(page.root.style.display, 'flex')
  page.runtime.unmount()
  await page.dispose()
  assert.equal(calls.release, 1)
})
