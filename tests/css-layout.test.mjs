import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Electron webview keeps flex display to expand its internal shadow iframe', async () => {
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
  const rule = css.match(/\.dotsWebview\s*\{([^}]*)\}/)?.[1]
  assert.ok(rule, 'Production webview sizing rule is missing')
  assert.match(rule, /display:\s*flex\s*;/, 'Do not override Electron webview default display:flex')
  assert.match(rule, /min-height:\s*0\s*;/)
  assert.match(rule, /height:\s*100%\s*;/)
  assert.doesNotMatch(rule, /display:\s*block\s*;/)
  const page = css.match(/\.dotsPage\s*\{([^}]*)\}/)?.[1]
  assert.match(page ?? '', /flex:\s*1\s+1\s+auto\s*;/, 'Main DSH flex column must give plugin panel remaining height')
})
