import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { createMcpController, registerMcpTransport } from '../lib/mcp-control.mjs'

test('real HTTP MCP announces the library before use and returns its full index after native failures; verified lessons persist and share the UI store', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-dot-skill-loop-'))
  const routes = new Map()
  const ctx = {
    connection: { createPeer: () => ({ dispose() {} }), fetch: { register: route => {
      routes.set(route.path, route); return () => routes.delete(route.path)
    } } },
    typertGateway: { async invoke({ method }) {
      if (method === 'blocked') return { results: [{ result: {
        isError: true, value: { sandbox: { mode: 'workspace-write', denied: true } },
      } }] }
      if (method === 'install') throw Object.assign(new Error('importPackage EPERM'), { code: 'ERR_PNPM_EPERM' })
      if (method === 'cache') throw Object.assign(new Error('cache index unreadable'), { code: 'CACHE_INDEX_BROKEN' })
      return { ok: true }
    } },
  }
  const options = { configPath: join(dir, 'mcp.json') }
  const control = createMcpController(ctx, options)
  const unregister = registerMcpTransport(ctx.connection, control)
  const client = new Client({ name: 'skills-e2e', version: '1.0.0' })
  t.after(async () => {
    await client.close(); await unregister(); await control.dispose(); await rm(dir, { recursive: true, force: true })
  })
  const status = await control.configure({ enabled: true })
  await client.connect(new StreamableHTTPClientTransport(new URL(status.localUrl)))
  assert.match(client.getInstructions(), /若工具本身需要 DSH 会话.*这不等于向 AI 派任务/)
  assert.match(client.getInstructions(), /只有用户明确要求.*Dot 确认自己直接做不了/)
  assert.match(client.getInstructions(), /用户另有指定.*Dot Direct Missions.*工作区 ID.*「未分组」/)
  assert.match(client.getInstructions(), /找到适用方法就直接动手排错.*不能只翻一遍就报失败/)
  assert.match(client.getInstructions(), /验证解决后，先补记再结束/)
  assert.match(client.getInstructions(), /dsh_skill_search.*dsh_skill_read.*dsh_skill_save/)
  const call = (name, args = {}) => client.callTool({ name, arguments: args })
  const run = method => call('dsh_api_call', { namespace: 'sample', method, args: {} })
  const ui = async (endpoint, payload) => {
    const method = 'dsh-dot-mcp-mcp/' + endpoint
    const path = '/api/' + method
    const result = await routes.get(path).fetch(new Request('http://localhost' + path, { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: endpoint, method, payload }) }))
    return (await result.json()).result
  }
  const tools = (await client.listTools()).tools
  assert.equal(tools.find(tool => tool.name === 'dsh_skill_search').annotations.readOnlyHint, true)
  assert.notEqual(tools.find(tool => tool.name === 'dsh_skill_save').annotations?.readOnlyHint, true)
  assert.match(tools.find(tool => tool.name === 'dsh_api_call').description, /Apply the fix and verify/)
  const blocked = await run('blocked')
  assert.equal(blocked.isError, true)
  assert.equal(blocked.structuredContent.troubleshooting.lookup, undefined)
  assert.deepEqual(blocked.structuredContent.troubleshooting.catalog, [])
  assert.deepEqual((await call('dsh_skill_search')).structuredContent.skills, [])
  assert.deepEqual((await run('install')).structuredContent.troubleshooting.catalog, [])
  assert.equal((await run('works')).structuredContent.troubleshooting, undefined)
  assert.deepEqual((await run('cache')).structuredContent.troubleshooting.catalog, [])
  const lesson = { title: '工作区外写入被拒', symptom: 'workspace-write 下命令无法写入指定位置或系统临时目录。',
    resolution: '先检查拒绝来自会话沙箱而非普通 EPERM。可行时使用已有权限；若必须使用全权限，按要求仅在本次任务会话启用。',
    verification: '对照发现只读会话不能写普通文件，同一认证 MCP 仍可写入并读回本测试样本。', scope: '工作区写入权限测试' }
  const saved = (await call('dsh_skill_save', lesson)).structuredContent.skill
  assert.equal((await run('cache')).structuredContent.troubleshooting.catalog.some(entry => entry.id === saved.id), true)
  assert.equal((await run('install')).structuredContent.troubleshooting.catalog.some(entry => entry.id === saved.id), true)
  assert.equal((await call('dsh_skill_search', { query: 'workspace-write' })).structuredContent.skills[0].id, saved.id)
  assert.equal((await call('dsh_skill_read', { id: saved.id })).structuredContent.skill.id, saved.id)
  assert.equal((await ui('skillList', { query: '工作区外' })).value[0].id, saved.id)
  assert.equal((await ui('skillRead', { id: saved.id })).value.verification, lesson.verification)
  assert.equal((await ui('skillSave', { ...lesson, id: saved.id, scope: 'One local index' })).ok, true)
  assert.equal((await call('dsh_skill_read', { id: saved.id })).structuredContent.skill.scope, 'One local index')
  const reopened = createMcpController(ctx, options)
  assert.equal((await reopened.skillRead({ id: saved.id })).id, saved.id)
  assert.equal((await ui('skillRemove', { id: saved.id })).value, true)
  assert.deepEqual((await run('cache')).structuredContent.troubleshooting.catalog, [])
  await reopened.dispose()
})
