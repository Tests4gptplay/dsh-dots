import test from 'node:test'
import assert from 'node:assert/strict'
import { loadNativeClient } from './cases/load-native-client.mjs'
import { createMockDotBackend } from './cases/mock-dots-backend.mjs'
import { flatten } from './cases/runtime.mjs'

function render(page, backend) {
  const vnode = page.runtime.React.createElement(page.main.component, { ...page.props, __testDotsBackend: backend })
  return flatten(page.runtime.expand(vnode))
}
function input(page, backend) { return render(page, backend).find(node => node.type === 'input') }
function form(page, backend) { return render(page, backend).find(node => node.type === 'form') }

test('mock Dot accepts foreground input and returns a labeled simulated reply', async () => {
  const backend = createMockDotBackend()
  const page = await loadNativeClient()
  assert.ok(render(page, backend).some(n => n.props?.['data-testid'] === 'mock-badge'))
  assert.equal(render(page, backend).some(n => n.type === 'iframe'), false)
  input(page, backend).props.onChange({ target: { value: '前台测试消息' } })
  await form(page, backend).props.onSubmit({ preventDefault() {} })
  const tree = JSON.stringify(render(page, backend))
  assert.match(tree, /前台测试消息/)
  assert.match(tree, /【模拟 Dot 回复】已收到/)
  assert.equal(backend.calls, 1)
})

test('a synthetic server error appears in the UI and keeps the conversation usable', async () => {
  const backend = createMockDotBackend()
  const page = await loadNativeClient()
  input(page, backend).props.onChange({ target: { value: '触发模拟失败' } })
  await form(page, backend).props.onSubmit({ preventDefault() {} })
  const nodes = render(page, backend)
  const error = nodes.find(n => n.props?.['data-testid'] === 'mock-error')
  assert.match(JSON.stringify(error), /模拟后端返回的测试错误/)
  input(page, backend).props.onChange({ target: { value: '再次提问' } })
  await form(page, backend).props.onSubmit({ preventDefault() {} })
  assert.match(JSON.stringify(render(page, backend)), /已收到：再次提问/)
  assert.equal(backend.calls, 2)
})

test('mock path never opens official Dots iframe and is available only by explicit test injection', async () => {
  const backend = createMockDotBackend()
  const page = await loadNativeClient()
  assert.equal(render(page, backend).filter(n => n.type === 'iframe').length, 0)
  assert.equal(render(page, undefined).filter(n => n.type === 'iframe').length, 1)
})
