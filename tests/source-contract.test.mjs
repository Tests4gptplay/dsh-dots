import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.env.DSH_SOURCE_DIR
const from = subpath => path.join(root, subpath)

test('real DSH source confirms main/sidebar Slot signatures', { skip: !root }, async () => {
  const source = await readFile(from('packages/client/ui-schedule/src/client/index.ts'), 'utf8')
  assert.match(source, /ctx\.slots\.inject\('main'/)
  assert.match(source, /ctx\.slots\.inject\('sidebar\.panellist'/)
  assert.match(source, /ctx\.slots\.register\(/)
})

test('real DSH browser supports guarded tab opening and Electron WebView carrier', { skip: !root }, async () => {
  const source = await readFile(from('packages/client/ui-sidebar-browser/src/client/index.ts'), 'utf8')
  const readme = await readFile(from('packages/client/ui-sidebar-browser/README.md'), 'utf8')
  assert.match(source, /createElectronPage/)
  assert.match(source, /createIframePage/)
  assert.match(readme, /openTab\('browser', \{ params: \{ url \} \}\)/)
  assert.match(readme, /Cookies and Web storage do not survive application restart/i)
})

test('real DSH Browser source documents site embedding limitations', { skip: !root }, async () => {
  const readme = await readFile(from('packages/client/ui-sidebar-browser/README.md'), 'utf8')
  assert.match(readme, /iframe/)
  assert.match(readme, /X-Frame-Options/)
})


test('real DSH Desktop bridge offers browser guest reservation independent of session sidebar', { skip: !root }, async () => {
  const guests = await readFile(from('apps/desktop/src/browser-guests.ts'), 'utf8')
  const preload = await readFile(from('apps/desktop/src/preload-browser.ts'), 'utf8')
  assert.match(guests,/acquire\(owner: WebContents, workspace: unknown\)/)
  assert.match(guests,/will-attach-webview/)
  assert.match(guests,/partition: lease.partition/)
  assert.match(preload,/browserAcquire/)
  assert.match(preload,/onOpenRequested/)
})
