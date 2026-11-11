import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

test('bilingual native Settings notification switch is off by default and saves exact user-selected scope', async () => {
  const dom = new JSDOM('<div id="app"></div>', { url: 'http://localhost', runScripts: 'outside-only' })
  const previous = new Map()
  for (const [key, value] of Object.entries({
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  }
  let client
  try {
    dom.window.__ModuleLoader__ = { load({ factory }) { client = factory(() => React) } }
    dom.window.eval(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'))
    const requests = []
    let settings = { enabled: false, sessions: [], types: [], subscriptionCount: 0, events: ['dsh.session.turn-ended', 'dsh.session.error'] }
    const notifyRpc = async (method, payload = {}) => {
      requests.push({ method, payload })
      if (method === 'configure') settings = { ...settings, ...payload }
      return { ...settings }
    }
    const root = createRoot(dom.window.document.getElementById('app'))
    try {
      await act(async () => root.render(React.createElement(client.DotsNotifySettings, {
        t: key => client.zh[key] ?? key, notifyRpc, mcpRunning: true,
      })))
      const document = dom.window.document
      const switchControl = document.querySelector('[data-testid="dots-notify-settings"] [role="switch"]')
      assert.ok(switchControl)
      assert.equal(switchControl.checked, false)
      assert.match(document.body.textContent, /主动通知已关闭/)
      const textarea = document.querySelector('[data-testid="dots-notify-settings"] textarea')
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set
        setter.call(textarea, 'session-one\nsession-two')
        textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
      })
      const checkboxes = [...document.querySelectorAll('[data-testid="dots-notify-settings"] input[type="checkbox"]')]
      await act(async () => { checkboxes[1].click() })
      const save = [...document.querySelectorAll('button')].find(el => el.textContent === '保存通知范围')
      await act(async () => save.click())
      await act(async () => switchControl.click())
      const current = requests.filter(req => req.method === 'configure').at(-1).payload
      assert.equal(current.enabled, true)
      assert.deepEqual(Array.from(current.types), ['dsh.session.turn-ended'])
      assert.deepEqual(Array.from(current.sessions), ['session-one', 'session-two'])
      await act(async () => switchControl.click())
      assert.equal(requests.filter(req => req.method === 'configure').at(-1).payload.enabled, false)
      assert.match(document.body.textContent, /主动通知已关闭/)
    } finally { await act(async () => root.unmount()) }
  } finally {
    dom.window.close()
    for (const [key, value] of previous) {
      if (value) Object.defineProperty(globalThis, key, value)
      else delete globalThis[key]
    }
  }
})
