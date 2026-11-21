import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSkillStore, skillFieldLimits } from '../src/skill-store.mjs'

const sample = {
  title: '导出报告找不到附件',
  symptom: '集成测试报告预览出现 EXPORT_MISSING。',
  resolution: '先查看该次任务的产出文件，再核对导出目录。',
  verification: '用同一任务重试，附件存在且可打开。',
  scope: 'Windows 报告导出',
}
const file = 'dot-mcp-skills.json'
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'dot-mcp-skills-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return { directory, store: createSkillStore({ directory }) }
}

test('a new profile starts with an empty catalog and does not create storage until its first write', async t => {
  const { directory, store } = await fixture(t)
  assert.deepEqual(await store.list(), [])
  assert.deepEqual(await store.list({ query: 'workspace-write' }), [])
  assert.equal(await store.read({ id: 'workspace-write-outside' }), null)
  assert.deepEqual(await readdir(directory), [])
})

test('learned notes survive reopening and are searchable by symptom, keywords and scope', async t => {
  const { directory, store } = await fixture(t)
  const saved = await store.save({ ...sample, id: 'report-export' })
  assert.equal(saved.builtIn, false)
  assert.ok(Number.isFinite(Date.parse(saved.updatedAt)))
  const reopened = createSkillStore({ directory })
  assert.deepEqual(await reopened.read({ id: saved.id }), saved)
  for (const query of ['missing', '导出报告附件', 'Windows EXPORT_MISSING', '同一任务重试', 'report-export']) {
    const found = (await reopened.list({ query }))[0]
    assert.equal(found.id, saved.id, query)
    assert.equal('resolution' in found, false)
  }
  assert.deepEqual(await reopened.list({ query: 'no-possible-match' }), [])
  assert.deepEqual(await readdir(directory), [file])
})

test('same title and scope update the existing record; explicit IDs address separate records', async t => {
  const { store } = await fixture(t)
  const one = await store.save(sample)
  const updated = await store.save({ ...sample, title: ' ' + sample.title + ' ', resolution: '改用预览读取附件。' })
  assert.equal(one.id, updated.id)
  assert.equal((await store.read({ id: one.id })).resolution, updated.resolution)
  const separate = await store.save({ ...sample, scope: undefined, id: 'other-scope' })
  assert.equal(separate.scope, '')
  assert.equal(await store.remove({ id: one.id }), true)
  assert.equal(await store.remove({ id: one.id }), false)
  assert.equal(await store.read({ id: one.id }), null)
  assert.deepEqual((await store.list()).filter(entry => !entry.builtIn).map(entry => entry.id), [separate.id])
})

test('same-process writes through independent store objects do not lose records', async t => {
  const { directory, store } = await fixture(t)
  const parallel = createSkillStore({ directory })
  await Promise.all(Array.from({ length: 20 }, (_, index) => (index % 2 ? store : parallel).save({
    ...sample, id: 'job-' + index, title: '导出记录 ' + index,
  })))
  assert.equal((await store.list()).filter(result => !result.builtIn).length, 20)
  assert.deepEqual(await readdir(directory), [file])
})

test('invalid records, path IDs and evident credentials are rejected without writes', async t => {
  const { directory, store } = await fixture(t)
  await assert.rejects(store.save({ ...sample, id: '../trash' }), { code: 'SKILL_INVALID_INPUT' })
  await assert.rejects(store.read({ id: '..\\file' }), { code: 'SKILL_INVALID_INPUT' })
  await assert.rejects(store.save({ ...sample, verification: ' ' }), { code: 'SKILL_INVALID_INPUT' })
  await assert.rejects(store.save({ ...sample, title: 'x'.repeat(skillFieldLimits.title + 1) }), { code: 'SKILL_INVALID_INPUT' })
  await assert.rejects(store.list({ query: 'x'.repeat(skillFieldLimits.query + 1) }), { code: 'SKILL_INVALID_INPUT' })
  for (const text of [
    'Authorization: Bearer exampletoken0123456789',
    'https://example.invalid/path?access_token=examplevalue',
    'http://username:password@example.invalid',
    'GITHUB_TOKEN=ghp_012345678901234567890123456789012345',
    '-----BEGIN OPENSSH PRIVATE KEY-----',
    '口令：example-secret-token',
  ]) await assert.rejects(store.save({ ...sample, resolution: text }), { code: 'SKILL_SECRET' })
  assert.deepEqual(await readdir(directory), [])
})

test('corrupt records are not silently reset', async t => {
  const { directory, store } = await fixture(t)
  const path = join(directory, file)
  await writeFile(path, '{"broken":')
  await assert.rejects(store.read({ id: 'workspace-write-outside' }), { code: 'SKILL_STORE_CORRUPT' })
  await assert.rejects(store.list(), { code: 'SKILL_STORE_CORRUPT' })
  await assert.rejects(store.save(sample), { code: 'SKILL_STORE_CORRUPT' })
  assert.equal(await readFile(path, 'utf8'), '{"broken":')
  await writeFile(path, '{"version":1,"records":[]}')
  assert.equal((await store.save(sample)).title, sample.title)
})

test('fixed storage file does not follow a storage symlink', { skip: process.platform === 'win32' }, async t => {
  const { directory, store } = await fixture(t)
  const other = join(directory, 'not-the-skill-database.json')
  await writeFile(other, '{"version":1,"records":[]}')
  await symlink(other, join(directory, file))
  await assert.rejects(store.list(), { code: 'SKILL_STORE_CORRUPT' })
  await assert.rejects(store.save(sample), { code: 'SKILL_STORE_CORRUPT' })
  assert.equal(await readFile(other, 'utf8'), '{"version":1,"records":[]}')
})
