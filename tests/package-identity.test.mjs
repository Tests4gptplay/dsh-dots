import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Dot MCP has independent unscoped package, Cordis and client identity', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  const client = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  const host = await readFile(new URL('../lib/host.js', import.meta.url), 'utf8')
  assert.equal(manifest.name, 'dsh-dot-mcp')
  assert.equal(manifest.version, '1.0.2')
  assert.match(patch, /^\s+- id: dsh-dot-mcp\s*$/m)
  assert.match(patch, /^\s+name: dsh-dot-mcp\s*$/m)
  assert.match(client, /__ModuleLoader__\.load\(\{\s*id: ['"]dsh-dot-mcp['"]/)
  assert.match(host, /export const name = 'dsh-dot-mcp'/)
  assert.doesNotMatch(patch, /@tests4gptplay\//)
})


test('built MCP initialize and native status versions match package', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const { VERSION } = await import('../lib/mcp-server.mjs')
  const { createDshAdapter } = await import('../lib/mcp-adapter.mjs')
  assert.equal(VERSION, manifest.version)
  const adapter = createDshAdapter({}, {})
  const status = await adapter.tools.find(tool => tool.name === 'dsh_status').run({})
  assert.equal(status.version, manifest.version)
  assert.equal(status.plugin, manifest.name)
})

test('HTTP initialize and dsh_status advertise the installed package version', async t => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const { Client, StreamableHTTPClientTransport } = await import('@modelcontextprotocol/client')
  const { startMcpServer } = await import('../lib/mcp-server.mjs')
  const { createDshAdapter } = await import('../lib/mcp-adapter.mjs')
  const server = await startMcpServer({ adapter: createDshAdapter({}, {}), token: 'version-regression' })
  const client = new Client({ name: 'version-regression', version: '1.0.0' })
  t.after(async () => { await client.close(); await server.close() })
  await client.connect(new StreamableHTTPClientTransport(new URL(server.localUrl)))
  assert.deepEqual(client.getServerVersion(), { name: manifest.name, version: manifest.version })
  const status = await client.callTool({ name: 'dsh_status', arguments: {} })
  assert.equal(status.structuredContent.version, manifest.version)
  assert.equal(status.structuredContent.plugin, manifest.name)
})
