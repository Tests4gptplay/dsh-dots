import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
const requests = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const actual = JSON.parse(readFileSync('npm-dist/package-verification.json', 'utf8'))
const matching = requests.packages.filter(item => item.name === actual.name)
assert.equal(matching.length, 1, 'Package must appear exactly once in the batch request')
const expected = matching[0]
for (const field of ['name', 'version', 'filename', 'sha256', 'integrity']) assert.equal(actual[field], expected[field], `Batch request mismatch: ${field}`)
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), expected.sourceCommit, 'Source commit must match the reviewed pin')
assert.equal(expected.access, 'public')
assert.equal(expected.tag, 'latest')
console.log(`Verified pinned source and exact publish request for ${actual.name}@${actual.version}`)

if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `publish=${requests.publish === true}\n`)
