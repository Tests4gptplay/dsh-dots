import test from 'node:test'
import assert from 'node:assert/strict'
import { loadNativeClient } from './cases/load-native-client.mjs'

function bridgeCase() {
  const calls = { acquire: [], release: [], forwarded: null }
  const bridge = {
    async acquire(workspace) { calls.acquire.push(workspace); return { lease:'lease-verified', partition:'dsh-partition-verified' } },
    async release(lease) { calls.release.push(lease) },
    onOpenRequested(lease, listener) {
      assert.equal(lease, 'lease-verified')
      calls.forwarded = listener
      return () => { calls.forwarded = null }
    },
  }
  return { bridge, calls }
}

const tick = () => new Promise(resolve => setImmediate(resolve))

test('Desktop browser uses available host APIs without a protocol-version gate', async () => {
  const { bridge } = bridgeCase()
  for (const protocolVersion of [1, 2, undefined]) {
    const page = await loadNativeClient({ desktopBridge: { protocolVersion, browser: bridge } })
    assert.equal(page.client.desktopBrowserBridge(), bridge)
  }
  const incomplete = await loadNativeClient({
    desktopBridge: { protocolVersion: 1, browser: { acquire: async () => {} } },
  })
  assert.equal(incomplete.client.desktopBrowserBridge(), undefined)
})

test('DSH Desktop guest uses host-issued partition and renders Dot as a full browser page', async () => {
  const page = await loadNativeClient()
  const {bridge,calls} = bridgeCase()
  const attached = []
  const opened = page.client.mountDesktopDotGuest({ append(node) { attached.push(node) } }, bridge, () => {
    throw Error('unexpected browser failure')
  }, () => {})
  await tick()
  assert.deepEqual(calls.acquire,['dsh-dots:personal-browser'])
  assert.equal(attached.length,1)
  const view = attached[0]
  assert.equal(view.tag,'webview')
  assert.equal(view.attrs.src,'about:blank#lease-verified')
  assert.equal(view.attrs.partition,'dsh-partition-verified')
  assert.equal(view.attrs.name,'lease-verified')
  assert.equal(view.className,'dotsWebview')
  view.emit('dom-ready')
  await tick()
  assert.deepEqual(view.navigations,['https://chatgpt.com/dots/home'])
  view.emit('dom-ready')
  await tick()
  assert.equal(view.navigations.length,1,'subsequent navigations must not snap back to Dots home')
  calls.forwarded('https://auth.openai.com/authorize')
  await tick()
  assert.deepEqual(view.navigations,['https://chatgpt.com/dots/home','https://auth.openai.com/authorize'])
  calls.forwarded('file:///etc/passwd')
  await tick()
  assert.equal(view.navigations.length,2,'only HTTP(S) navigation requests are allowed')
  opened.reload()
  assert.equal(view.reloads,1)
  await opened.dispose()
  assert.equal(view.removed,true)
  assert.deepEqual(calls.release,['lease-verified'])
  assert.equal(calls.forwarded,null)
})

test('a disposed in-flight lease cannot create a late guest or leak partition', async () => {
  const page = await loadNativeClient()
  let releaseAcquire
  const releases = []
  const bridge = {
    acquire: () => new Promise(resolve => { releaseAcquire=resolve }),
    release: async lease => { releases.push(lease) },
  }
  const attached = []
  const controller=page.client.mountDesktopDotGuest({append(node){attached.push(node)}},bridge,()=>{},()=>{})
  const dispose=controller.dispose()
  releaseAcquire({lease:'late-lease',partition:'late-partition'})
  await dispose
  assert.deepEqual(releases,['late-lease'])
  assert.deepEqual(attached,[])
})

test('Desktop guest creation reports genuine failure but does not claim login', async () => {
  const page = await loadNativeClient()
  const messages=[]
  const bridge={acquire:async()=>{throw Error('desktop lease refused')},release:async()=>{}}
  const controller=page.client.mountDesktopDotGuest({append(){throw Error('should not mount')}},bridge,error=>messages.push(String(error)),()=>{})
  await tick()
  assert.match(messages[0],/desktop lease refused/)
  await controller.dispose()
})


test('a failed guest DOM attachment releases only its own approved lease', async () => {
  const page = await loadNativeClient()
  const {bridge,calls} = bridgeCase()
  const errors=[]
  const controller=page.client.mountDesktopDotGuest({append(){ throw Error('DOM attachment denied') }},
    bridge,error=>errors.push(String(error)),()=>{})
  await tick()
  assert.deepEqual(calls.release,['lease-verified'])
  assert.match(errors[0],/DOM attachment denied/)
  await controller.dispose()
  assert.equal(calls.release.length,1)
})
