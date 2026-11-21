import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'

const builtin = { id: 'example', title: '示例 EPERM', symptom: '暂存目录占用', resolution: '<b>释放占用后重试</b>',
  verification: '相同步骤重试通过', scope: 'Windows', builtIn: true }
const local = { id: 'mine', title: 'Local Skill', symptom: 'old symptom', resolution: 'fixed',
  verification: 'independently confirmed', scope: '', builtIn: false }

async function fixture(t, language = 'zh') {
  const dom = new JSDOM('<html><body><main class="dotsSettings" id="app"></main></body></html>', { runScripts: 'outside-only' })
  const prior = new Map()
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) {
    prior.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true })
  }
  const { createRoot } = await import('react-dom/client')
  const doc = dom.window.document
  dom.window.require = key => { if (key === 'react') return React; throw new Error(key) }
  dom.window.exports = {}
  dom.window.eval(await readFile(new URL('../src/client.js', import.meta.url), 'utf8'))
  const client = dom.window.exports
  const entries = new Map([[builtin.id, builtin], [local.id, local]])
  const calls = []
  let failSave = false
  const rpc = async (operation, payload, signal) => {
    calls.push({ operation, payload, signal })
    if (operation === 'skillList') return [...entries.values()].filter(row => !payload.query || row.title.includes(payload.query))
    if (operation === 'skillRead') return entries.get(payload.id) ?? null
    if (operation === 'skillSave') {
      if (failSave) throw new Error('Local save failed')
      const row = { ...payload, id: payload.id ?? 'new-entry', builtIn: false }
      entries.set(row.id, row)
      return row
    }
    if (operation === 'skillRemove') return entries.delete(payload.id)
    throw new Error(operation)
  }
  const root = createRoot(doc.getElementById('app'))
  await act(async () => root.render(React.createElement(client.DotsSkillSettings, { t: key => client[language][key] ?? key, mcpRpc: rpc })))
  t.after(async () => {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of prior) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]
  })
  return {
    doc, calls, entries, failSave(value) { failSave = value },
    click: node => act(async () => node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))),
    type: (node, value) => act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), 'value').set.call(node, value)
      node.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    }),
    button: label => [...doc.querySelectorAll('button')].find(node => node.textContent === label),
    row: title => [...doc.querySelectorAll('.dotsSkillToggle')].find(node => node.querySelector('.dotsSkillTitle').textContent === title),
    text: () => doc.body.textContent,
    submit: () => act(async () => doc.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))),
  }
}

test('Chinese Skills panel searches in the local store and displays built-in notes without controls or HTML interpretation', async t => {
  const f = await fixture(t)
  const search = f.doc.querySelector('input[type=search]')
  await f.type(search, 'EPERM')
  await act(async () => new Promise(resolve => setTimeout(resolve, 210)))
  assert.equal(f.calls.filter(call => call.operation === 'skillList').at(-1).payload.query, 'EPERM')
  assert.ok(!f.row('Local Skill'))
  await f.click(f.row('示例 EPERM'))
  assert.equal(f.calls.at(-1).operation, 'skillRead')
  assert.match(f.text(), /<b>释放占用后重试<\/b>/)
  assert.equal(f.doc.querySelector('.dotsSkillDetail b'), null)
  assert.match(f.text(), /相同步骤重试通过/)
  assert.match(f.text(), /Windows/)
  assert.equal(f.button('编辑'), undefined)
  assert.equal(f.button('删除'), undefined)
})

test('local notes can be edited and deleted only after an explicit confirmation', async t => {
  const f = await fixture(t, 'en')
  await f.click(f.row('Local Skill'))
  await f.click(f.button('Edit'))
  const symptom = f.doc.querySelector('form textarea')
  await f.type(symptom, 'updated symptom')
  f.failSave(true)
  await f.submit()
  assert.match(f.text(), /Local save failed/)
  assert.equal(f.doc.querySelector('form textarea').value, 'updated symptom')
  f.failSave(false)
  await f.submit()
  assert.equal(f.entries.get(local.id).symptom, 'updated symptom')
  assert.equal(f.doc.querySelector('form'), null)
  await f.click(f.button('Delete'))
  assert.ok(!f.calls.some(call => call.operation === 'skillRemove'))
  await f.click(f.button('Cancel'))
  assert.ok(f.row('Local Skill'))
  await f.click(f.button('Delete'))
  await f.click(f.button('Confirm deletion'))
  assert.ok(!f.row('Local Skill'))
  assert.equal(f.entries.has(local.id), false)
})

test('new notes require a verified result, and use the local save method', async t => {
  const f = await fixture(t, 'en')
  await f.click(f.button('New Skill'))
  const inputs = f.doc.querySelectorAll('form input,form textarea')
  assert.equal(f.button('Save Skill').disabled, true)
  for (const [index, value] of ['A new skill', 'Failure', 'A recoverable fix', 'Rerun passed'].entries()) await f.type(inputs[index], value)
  assert.equal(f.button('Save Skill').disabled, false)
  await f.submit()
  assert.equal(f.entries.get('new-entry').verification, 'Rerun passed')
  assert.ok(f.row('A new skill'))
})
