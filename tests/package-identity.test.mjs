import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// The GitHub Release v1.0.11 is installed under this package identity.
// The scoped npm publisher stages a separate npm identity from this source.
test('GitHub release updates keep the original Dots package and module identities', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  const client = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.equal(manifest.name, 'dsh-dots')
  assert.match(patch, /^\s+- id: dsh-dots\s*$/m)
  assert.match(patch, /^\s+name: dsh-dots\s*$/m)
  assert.match(client, /__ModuleLoader__\.load\(\{\s*id: ['"]dsh-dots['"]/)
  assert.doesNotMatch(patch, /@tests4gptplay\/dsh-dots/)
})
