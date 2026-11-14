/** Scope and sizing regressions for the actual Dots Settings CSS. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
test('Settings checkboxes retain intrinsic sizing instead of filling a form row', () => {
  assert.doesNotMatch(css, /\.dotsTunnelSettings\s+input\s*\{[^}]*width:\s*100%/)
  const checks = css.match(/\.dotsSettings input\[type=checkbox\],[^{]*\{([^}]+)\}/)?.[1]
  assert.match(checks ?? '', /width:\s*16px/)
  assert.match(checks ?? '', /flex:\s*0 0 16px/)
  const row = css.match(/\.dotsSettings \.dotsMcpSwitch\s*\{([^}]+)\}/)?.[1]
  assert.match(row ?? '', /align-items:\s*center/)
  assert.match(row ?? '', /flex-wrap:\s*nowrap/)
})
test('Settings form typography is explicit and field sizing excludes checkbox controls', () => {
  assert.match(css, /\.dotsSettings\s*\{[^}]*font-size:\s*13px/s)
  assert.match(css, /input:not\(\[type=checkbox\]\):not\(\[type=radio\]\)/)
  assert.match(css, /\.dotsSettings \.dotsFieldRow > button\s*\{[^}]*flex:\s*0 0 auto/)
  assert.match(css, /\.dotsSettings \.dotsMcpHint\s*\{[^}]*font-size:\s*12px/)
})
test('Settings presentation stays scoped and uses native DSH theme tokens', () => {
  assert.match(css, /--dsw-alias-settings-card-fill/)
  assert.match(css, /--dsw-alias-label-secondary/)
  assert.match(css, /:focus-visible/)
  assert.doesNotMatch(css, /(?:^|\n)(?:input|label|button|textarea)\s*\{/)
})
