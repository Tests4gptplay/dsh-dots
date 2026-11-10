import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

async function fixture(t, language = 'zh') {
  const dom = new JSDOM('<div id="app"></div>', { url: 'http://localhost', runScripts: 'outside-only' })
  const previous = new Map()
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  }
  let client
  dom.window.__ModuleLoader__ = { load({ factory }) { client = factory(() => React) } }
  dom.window.eval(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'))
  const calls = []; let state = { installDirectory: '/profile/dots/tunnel-client', executable: '', tunnelId: '', running: false, installed: false }, pending
  const rpc = async (method, payload) => {
    calls.push({ method, payload })
    if (method === 'install') return new Promise(resolve => { pending = resolve })
    if (method === 'stop') state = { ...state, running: false }
    if (method === 'start') state = { ...state, running: true, health: null }
    if (method === 'configure') state = { ...state, ...payload, apiKey: undefined, keyAvailable: true }
    return state
  }
  const root = createRoot(dom.window.document.getElementById('app'))
  const mount = async (running = true) => act(async () => root.render(React.createElement(client.DotsTunnelSettings, { t: key => client[language][key] ?? key, tunnelRpc: rpc, mcpRunning: running })))
  const click = async text => act(async () => [...dom.window.document.querySelectorAll('button')].find(b => b.textContent === text).click())
  await mount()
  t.after(async () => { await act(async () => root.unmount()); dom.window.close(); for (const [key, value] of previous) { if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key] } })
  return { dom, calls, mount, click, resolveInstall: value => pending(value), text: () => dom.window.document.body.textContent }
}
test('tunnel UI contains installation directory, executable, tunnel ID, masked key and official links', async t => {
  const f = await fixture(t)
  const inputs = [...f.dom.window.document.querySelectorAll('input')]
  assert.equal(inputs.length, 4); assert.equal(inputs[0].value, '/profile/dots/tunnel-client'); assert.equal(inputs[3].type, 'password')
  assert.match(f.text(), /下载并安装官方客户端/); assert.match(f.text(), /Runtime API Key/)
  assert.equal(f.dom.window.document.querySelectorAll('a').length, 3)
})
test('client running is not shown as verified cloud readiness', async t => {
  const f = await fixture(t, 'en'); await f.click('Start tunnel')
  assert.match(f.text(), /Client running/); assert.match(f.text(), /read its official health report/)
  assert.doesNotMatch(f.text(), /Official client reports ready/)
})
test('native directory picker updates the selected install location', async t => {
  const f = await fixture(t, 'en')
  f.dom.window.__DSH_DIRECTORY_PICKER__ = { pick: async () => '/selected/location' }
  await f.mount(); await f.click('Choose directory')
  assert.equal(f.dom.window.document.querySelector('input').value, '/selected/location')
})
test('stop remains available during installation and late responses do not restore stale status', async t => {
  const f = await fixture(t, 'en')
  await f.click('Download and install official client')
  const stop = [...f.dom.window.document.querySelectorAll('button')].find(b => b.textContent === 'Stop / cancel')
  assert.equal(stop.disabled, false); await f.click('Stop / cancel')
  await act(async () => f.resolveInstall({ running: true, installDirectory: '/stale', executable: '', tunnelId: '' }))
  assert.match(f.text(), /Tunnel stopped/); assert.equal(f.dom.window.document.querySelector('input').value, '/profile/dots/tunnel-client')
})
test('MCP off still allows client installation while start follows the explicit MCP setting', async t => {
  const f = await fixture(t, 'en'); await f.mount(false)
  const buttons = [...f.dom.window.document.querySelectorAll('button')]
  assert.equal(buttons.find(b => b.textContent === 'Start tunnel').disabled, true)
  assert.equal(buttons.find(b => b.textContent === 'Download and install official client').disabled, false)
})
