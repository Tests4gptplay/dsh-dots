import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { loadNativeClient, find } from './cases/load-native-client.mjs'
import { flatten } from './cases/runtime.mjs'
const tick = () => new Promise(resolve => setImmediate(resolve))

test('persistent toolbar changes locale in place without recreating its guest', async () => {
 const calls = { acquire: 0, release: 0 }
 const page = await loadNativeClient({ desktopBridge: { browser: {
  async acquire() { calls.acquire++; return { lease:'locale', partition:'host-issued' } },
  async release() { calls.release++ }
 } } })
 await tick()
 const guest = page.created.find(n => n.tag === 'webview')
 const reload = find(page.root, n => n.className === 'dotsTool dotsReload')
 assert.equal(reload.textContent, '刷新')
 page.setLanguage('en')
 assert.equal(reload.textContent, 'Reload')
 const open = find(page.root, n => n.className === 'dotsTool dotsOpen')
 assert.equal(open.textContent, 'Open in browser')
 assert.equal(open.attrs.title, page.client.en.fallback)
 guest.emit('did-fail-load', { isMainFrame:true, errorCode:-2, errorDescription:'ERR_FAILED' })
 assert.equal(find(page.root, n => n.tag === 'span' && n.textContent === page.client.en.guestFailed)?.textContent, page.client.en.guestFailed)
 page.setLanguage('zh')
 assert.equal(reload.textContent, '刷新')
 assert.ok(find(page.root, n => n.textContent === page.client.zh.guestFailed))
 assert.equal(calls.acquire, 1)
 assert.equal(guest.reloads, 0)
 await page.dispose()
 assert.equal(page.localeListeners.size, 0)
 assert.equal(calls.release, 1)
})

test('production distribution has no test view, mock dictionary, or diagnostic overlay', async () => {
 const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
 assert.doesNotMatch(bundle, /MockDotConversation|__testDotsBackend|mockLabel|dotsMockBadge|dotsDiagnostic|statusText/)
 const page = await loadNativeClient({ language:'en' })
 const nodes = flatten(page.runtime.expand(page.runtime.React.createElement(page.main.component, page.props)))
 assert.doesNotMatch(JSON.stringify(nodes), /Dots 圆环/)
})

test('guest release is idempotent for concurrent and repeated disposal', async () => {
 const page = await loadNativeClient()
 const released = []
 const view = page.client.mountDesktopDotGuest({append() {}}, {
  acquire: async () => ({ lease:'once', partition:'once' }), release: async id => { released.push(id) }
 }, () => {}, () => {})
 await tick()
 await Promise.all([view.dispose(), view.dispose()])
 await view.dispose()
 assert.deepEqual(released, ['once'])
})


test('web controls reload and recover from external-open failures in the current language', async () => {
 const page = await loadNativeClient({language:'en'})
 let opened=false
 const props={...page.props,openExternal:()=>opened}
 const render=()=>flatten(page.runtime.expand(page.runtime.React.createElement(page.main.component,props)))
 const buttons=()=>render().filter(n=>n.type==='button')
 const first=render().find(n=>n.type==='iframe').props.key
 buttons()[0].props.onClick()
 assert.equal(render().find(n=>n.type==='iframe').props.key,first+1)
 buttons()[1].props.onClick()
 assert.match(JSON.stringify(render()),/Could not open the site/)
 page.setLanguage('zh')
 assert.match(JSON.stringify(render()),/未能打开网页/)
 opened=true;buttons()[1].props.onClick()
 assert.equal(render().some(n=>n.props?.role==='alert'),false)
})

test('persistent external-open errors are translated and recover without recreating the guest', async () => {
 const page=await loadNativeClient()
 let opened=false
 const root=page.client.mountPersistentDotsPage({acquire:async()=>({lease:'external',partition:'external'}),release:async()=>{}},page.props.t,()=>opened)
 await tick()
 const buttons=page.created.filter(n=>n.className==='dotsTool dotsOpen')
 buttons[0].emit('click')
 assert.ok(page.created.some(n=>n.textContent===page.client.zh.openFailed))
 page.setLanguage('en');root.refreshLocale()
 assert.ok(page.created.some(n=>n.textContent===page.client.en.openFailed))
 opened=true;buttons[0].emit('click')
 assert.equal(page.created.find(n=>n.className==='dotsEmbedNotice').style.display,'none')
 root.dispose()
})
