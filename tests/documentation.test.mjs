/** User documentation routing, packaged links and published verification assets. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const root = new URL('../', import.meta.url)
const text = path => readFile(new URL(path, root), 'utf8')
const repositoryPrefix = 'https://github.com/Tests4gptplay/dsh-dot-mcp/blob/v2.0.0/'
const pages = ['README.md', 'README.en.md', 'CHANGELOG.md', 'SPONSOR.md', 'docs/releases/v2.0.0.md', 'docs/releases/v2.0.0.en.md']

test('documentation: homepages introduce Dot MCP 1.0.0, link release notes and end with support', async () => {
  for (const [path, release, footer] of [
    ['README.md', 'v2.0.0.md', '## 支持项目'],
    ['README.en.md', 'v2.0.0.en.md', '## Support the project'],
  ]) {
    const content = await text(path)
    assert.ok(content.startsWith('# DSH Dot MCP ' + JSON.parse(await text('package.json')).version))
    assert.ok(content.includes(repositoryPrefix + 'docs/releases/' + release))
    assert.doesNotMatch(content, /!\[|<img\b/i, 'Screenshots belong on the linked update page')
    assert.equal(content.match(/^## .+$/gm).at(-1), footer)
    assert.match(content.slice(content.indexOf(footer)), /\]\(SPONSOR\.md\)/)
  }
  const manifest = JSON.parse(await text('package.json'))
  assert.ok(manifest.files.includes('SPONSOR.md'), 'The installed README support link needs its page in the package')
})

test('documentation: local pages and versioned repository links resolve to existing files', async () => {
  for (const page of pages) {
    const content = await text(page)
    for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)\s]+)\)/g)) {
      let target = decodeURI(match[1].split('#')[0])
      if (!target) continue
      if (target.startsWith(repositoryPrefix)) target = new URL(target.slice(repositoryPrefix.length), root)
      else if (/^[a-z]+:/i.test(target)) continue
      else target = new URL(target, new URL(page, root))
      await assert.doesNotReject(access(target), `${page}: missing link ${match[1]}`)
    }
  }
})

test('documentation: experiment output and original screenshots match the published verification record', async () => {
  const evidencePath = new URL('docs/releases/v2.0.0/verification.json', root)
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'))
  for (const image of evidence.screenshots) {
    const bytes = await readFile(new URL(image.file, evidencePath))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), image.sha256)
  }
  const experiments = JSON.parse(await text('docs/releases/v2.0.0/experiments.json'))
  const report = await readFile(new URL('docs/releases/v2.0.0/report.txt', root))
  assert.equal(createHash('sha256').update(report).digest('hex'), experiments.outputSha256)
  for (const language of ['', '.en']) {
    const release = await text(`docs/releases/v2.0.0${language}.md`)
    for (const image of evidence.screenshots) assert.ok(release.includes(image.file.replace('../../', '../')))
    assert.ok(release.includes('v2.0.0/experiments.json'))
  }
})
