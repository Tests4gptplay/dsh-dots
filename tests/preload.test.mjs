import test from 'node:test'
import assert from 'node:assert/strict'
import { loadNativeClient } from './cases/load-native-client.mjs'
const tick = () => new Promise(resolve => setImmediate(resolve))

test('startup preload survives page switches without recreating or reloading the guest', async () => {
  const calls = { acquire: 0, release: 0 }
  const bridge = {
    async acquire() { calls.acquire++; return { lease: 'preloaded', partition: 'persist:dsh-dots-personal-browser' } },
    async release() { calls.release++ },
  }
  const page = await loadNativeClient({ desktopBridge: { browser: bridge } })
  await tick()
  const view = page.created.find(node => node.tag === 'webview')
  const root = page.bodyChildren[0]
  assert.equal(calls.acquire, 1)
  assert.equal(root.style.visibility, 'hidden')
  assert.equal(root.children[0], view)
  view.emit('dom-ready')
  await tick()
  assert.deepEqual(view.navigations, ['https://chatgpt.com/dots/home'])
  view.emit('did-finish-load')
  let ready = 0
  const target = { isConnected: true, getBoundingClientRect: () => ({ left: 100, top: 60, width: 900, height: 600 }) }
  const session = page.props.desktopSession
  const detach = session.attach(target, () => assert.fail('unexpected error'), () => ready++)
  assert.equal(ready, 1)
  assert.equal(root.style.visibility, 'visible')
  assert.equal(root.style.width, '900px')
  detach()
  assert.equal(root.style.visibility, 'hidden')
  assert.equal(calls.release, 0)
  assert.equal(view.removed, false)
  const detachAgain = session.attach(target, () => {}, () => ready++)
  assert.equal(ready, 2)
  assert.equal(calls.acquire, 1)
  assert.equal(view.navigations.length, 1)
  assert.equal(view.reloads, 0)
  session.reload()
  assert.equal(view.reloads, 1)
  detachAgain()
  await page.dispose()
  assert.equal(calls.release, 1)
  assert.equal(view.removed, true)
  assert.equal(root.removed, true)
  assert.equal(page.windowEvents.size, 0)
})

test('Web profile does not create a desktop preload guest', async () => {
  const page = await loadNativeClient()
  assert.equal(page.props.desktopSession, undefined)
  assert.equal(page.created.filter(node => node.tag === 'webview').length, 0)
  await page.dispose()
})
