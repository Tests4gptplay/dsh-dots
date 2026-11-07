import assert from 'node:assert/strict'
import { readFileSync, appendFileSync, existsSync } from 'node:fs'
const actual = JSON.parse(readFileSync('npm-dist/package-verification.json', 'utf8'))
const path = `release/npm/${actual.version}.json`
const requested = existsSync(path)
if (requested) {
  const expected = JSON.parse(readFileSync(path, 'utf8'))
  for (const field of ['name', 'version', 'filename', 'sha256', 'integrity']) assert.equal(actual[field], expected[field], `Publish request mismatch: ${field}`)
  assert.equal(expected.access, 'public')
  assert.equal(expected.tag, 'latest')
  console.log(`Verified explicit publish request for ${actual.name}@${actual.version}`)
} else console.log(`Validation only: no ${path} publish request`)
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `publish=${requested}\nfilename=${actual.filename}\n`)
