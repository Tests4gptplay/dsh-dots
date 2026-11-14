import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Dot MCP has independent unscoped package, Cordis and client identity', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  const client = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  const host = await readFile(new URL('../lib/host.js', import.meta.url), 'utf8')
  assert.equal(manifest.name, 'dsh-dot-mcp')
  assert.equal(manifest.version, '1.0.0')
  assert.match(patch, /^\s+- id: dsh-dot-mcp\s*$/m)
  assert.match(patch, /^\s+name: dsh-dot-mcp\s*$/m)
  assert.match(client, /__ModuleLoader__\.load\(\{\s*id: ['"]dsh-dot-mcp['"]/)
  assert.match(host, /export const name = 'dsh-dot-mcp'/)
  assert.doesNotMatch(patch, /@tests4gptplay\//)
})
