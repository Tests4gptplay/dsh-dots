import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { appendFileSync, readFileSync } from 'node:fs'
const actual = JSON.parse(readFileSync('npm-dist/package-verification.json', 'utf8'))
assert.match(actual.name, /^@tests4gptplay\/dsh-(dots|video-vision|kujira-persona|codex-native|compaction-selector)$/)
assert.match(actual.version, /^\d+\.\d+\.\d+$/)
assert.equal(actual.filename, `${actual.name.replace('@', '').replace('/', '-')}-${actual.version}.tgz`)
assert.equal(createHash('sha256').update(readFileSync(`npm-dist/${actual.filename}`)).digest('hex'), actual.sha256)
const requirePresent = process.argv.includes('--require-present')
const url = `https://registry.npmjs.org/${actual.name.replace('/', '%2f')}/${actual.version}`
let published = false
const maxAttempts = requirePresent ? 61 : 1
for (let attempt = 0; attempt < maxAttempts; attempt++) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' })
  if (response.status === 404) {
    if (!requirePresent) break
    if (attempt < maxAttempts - 1) { await new Promise(resolve => setTimeout(resolve, 10000)); continue }
    throw new Error('Published version did not appear in the public registry within ten minutes')
  }
  assert.ok(response.ok, `Registry lookup failed: HTTP ${response.status}; do not publish on an uncertain lookup`)
  const info = await response.json()
  assert.equal(info.name, actual.name)
  assert.equal(info.version, actual.version)
  assert.equal(info.dist?.integrity, actual.integrity, 'Registry contains different bytes at this immutable version; refusing overwrite')
  published = true
  break
}
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `exists=${published}\nfilename=${actual.filename}\n`)
console.log(`${actual.name}@${actual.version}: ${published ? 'public registry integrity matches' : 'not published yet'}`)
if (published && process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Published and verified: [${actual.name}@${actual.version}](https://www.npmjs.com/package/${actual.name}/v/${actual.version})\n\nSHA-256: ${actual.sha256}\n`)
