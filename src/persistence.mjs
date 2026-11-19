/** Dots-only Electron archive adaptation. Does not read browser profiles or credentials. */
import { constants } from 'node:fs'
import { createRequire } from 'node:module'
import { promisify } from 'node:util'
// Electron treats app.asar as a virtual directory. Use its documented raw
// original-fs interface for the archive, falling back to Node fs in tests.
const require = createRequire(import.meta.url)
let fileSystem
try { fileSystem = require('original-fs') } catch { fileSystem = require('node:fs') }
const readFile = promisify(fileSystem.readFile)
const writeFile = promisify(fileSystem.writeFile)
const copyFile = promisify(fileSystem.copyFile)
const rename = promisify(fileSystem.rename)
const unlink = promisify(fileSystem.unlink)
const readdir = promisify(fileSystem.readdir)
const stat = promisify(fileSystem.stat)
import { createHash, randomUUID } from 'node:crypto'
import { basename, dirname, join, resolve } from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const DOTS_WORKSPACE = 'dsh-dots:personal-browser'
export const DOTS_PARTITION = 'persist:dsh-dots-personal-browser'
export const ORIGINAL = 'partition = `dsh-sidebar-browser-${randomUUID()}`;'
export const PATCHED = `partition = workspace === "${DOTS_WORKSPACE}" ? "${DOTS_PARTITION}" : \`dsh-sidebar-browser-\${randomUUID()}\`;`
const BACKUP_PREFIX = 'app.asar.before-dsh-dots-'

function digest(bytes) { return createHash('sha256').update(bytes).digest('hex') }
function asarHeader(bytes) {
  if (bytes.length < 16 || bytes.readUInt32LE(0) !== 4 || bytes.readUInt32LE(8) !== 4 + (bytes.readUInt32LE(4) - 8)) {
    throw new Error('DSH Desktop app.asar 文件头格式异常')
  }
  const headerSize = bytes.readUInt32LE(4)
  const jsonSize = bytes.readUInt32LE(12)
  const base = 8 + headerSize
  if (headerSize < 8 || jsonSize < 2 || 16 + jsonSize > base || base > bytes.length) {
    throw new Error('DSH Desktop app.asar 文件头长度异常')
  }
  let header
  try { header = JSON.parse(bytes.subarray(16, 16 + jsonSize).toString('utf8')) }
  catch { throw new Error('DSH Desktop app.asar 目录数据异常') }
  const entry = header?.files?.lib?.files?.['main.js']
  if (!entry || entry.unpacked || !Number.isSafeInteger(entry.size) || !/^(?:0|[1-9]\d*)$/.test(String(entry.offset))) {
    throw new Error('DSH Desktop app.asar 缺少可修改的 lib/main.js')
  }
  const start = base + Number(entry.offset)
  const end = start + entry.size
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end > bytes.length) {
    throw new Error('DSH Desktop app.asar 主模块偏移异常')
  }
  return { header, entry, start, end, module: bytes.subarray(start, end).toString('utf8') }
}
// Match the precise allocator assignment while tolerating harmless compiled whitespace changes.
// The owning class, session allocation, and workspace registration must still agree.
const ORIGINAL_CODE = /\bpartition\s*=\s*`dsh-sidebar-browser-\$\{\s*randomUUID\s*\(\s*\)\s*\}`\s*;?/gu
const PATCHED_CODE = /\bpartition\s*=\s*workspace\s*===\s*["']dsh-dots:personal-browser["']\s*\?\s*["']persist:dsh-dots-personal-browser["']\s*:\s*`dsh-sidebar-browser-\$\{\s*randomUUID\s*\(\s*\)\s*\}`\s*;?/gu
function allocator(source) {
  const start = source.search(/(?:var\s+DesktopBrowserGuests\s*=\s*class|class\s+DesktopBrowserGuests)\b/u)
  if (start < 0) return { state: 'incompatible' }
  const endMarker = source.indexOf('//#endregion', start)
  const body = source.slice(start, endMarker > start ? endMarker : undefined)
  const context = /this\s*\.\s*partitions\s*\.\s*set\s*\(\s*workspace\s*,\s*partition\s*\)/u.test(body)
    && /session\s*\.\s*fromPartition\s*\(\s*partition\s*\)/u.test(body)
  if (!context) return { state: 'incompatible' }
  const originals = [...body.matchAll(ORIGINAL_CODE)]
  const patches = [...body.matchAll(PATCHED_CODE)]
  if (originals.length + patches.length !== 1) return { state: 'incompatible' }
  const matched = originals[0] ?? patches[0]
  return { state: patches.length === 1 ? 'applied' : 'available',
    offset: start + matched.index, matched: matched[0] }
}
function moduleState(source) { return allocator(source).state }
function refreshIntegrity(entry, bytes) {
  if (entry.integrity) {
    const size = entry.integrity.blockSize
    if (!Number.isSafeInteger(size) || size < 1) throw new Error('ASAR 完整性块大小无效')
    entry.integrity.hash = digest(bytes)
    entry.integrity.blocks = []
    for (let i = 0; i < bytes.length; i += size) entry.integrity.blocks.push(digest(bytes.subarray(i, i + size)))
  }
}
function shiftedHeader(header, selectedEntry, delta) {
  function walk(node) {
    for (const child of Object.values(node.files ?? {})) {
      if (child.files) walk(child)
      else if (child !== selectedEntry && child.offset !== undefined && Number(child.offset) > Number(selectedEntry.offset)) {
        child.offset = String(Number(child.offset) + delta)
      }
    }
  }
  walk(header)
}
/** Rebuild an entire ASAR using its existing entries and one exact module change. */
export function rewriteArchive(bytes, direction = 'apply') {
  const { header, entry, start, end, module } = asarHeader(bytes)
  const match = allocator(module)
  if (match.state !== (direction === 'apply' ? 'available' : 'applied')) {
    throw new Error('DSH Desktop 浏览器分区代码与修复目标不匹配')
  }
  const to = direction === 'apply' ? PATCHED : ORIGINAL
  const changed = Buffer.from(module.slice(0, match.offset) + to + module.slice(match.offset + match.matched.length))
  const delta = changed.length - entry.size
  entry.size = changed.length
  refreshIntegrity(entry, changed)
  shiftedHeader(header, entry, delta)
  const json = Buffer.from(JSON.stringify(header), 'utf8')
  const padded = (json.length + 3) & ~3
  const prefix = Buffer.alloc(16 + padded)
  prefix.writeUInt32LE(4, 0)
  prefix.writeUInt32LE(8 + padded, 4)
  prefix.writeUInt32LE(4 + padded, 8)
  prefix.writeUInt32LE(json.length, 12)
  json.copy(prefix, 16)
  const result = Buffer.concat([prefix, bytes.subarray(8 + bytes.readUInt32LE(4), start), changed, bytes.subarray(end)])
  if (moduleState(asarHeader(result).module) !== (direction === 'apply' ? 'applied' : 'available')) {
    throw new Error('DSH Desktop 修改后主模块校验失败')
  }
  // Reversing must reconstruct the original archive payload exactly, apart from the canonical ASAR header encoding.
  return result
}

export async function locateArchive(options = {}) {
  const executable = options.executable ?? process.execPath
  const dir = dirname(executable)
  const mac = resolve(dir, '..', 'Resources', 'app.asar')
  const common = join(dir, 'resources', 'app.asar')
  const macLayout = /[\\/]Contents[\\/]MacOS[\\/]/u.test(executable)
  const candidates = options.override ? [resolve(options.override)] : [
    ...(options.resources ? [join(options.resources, 'app.asar')] : []),
    ...(macLayout ? [mac, common] : [common, mac]),
  ]
  for (const path of [...new Set(candidates)]) {
    try { if ((await stat(path)).isFile()) return path } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  return candidates[0]
}
async function readArchive(path) {
  const bytes = await readFile(path)
  return bytes
}
async function matchingBackup(path, actual) {
  const names = (await readdir(dirname(path))).filter(name => name.startsWith(BACKUP_PREFIX) || name === 'app.asar.before-dots-1.0.4')
  for (const name of names) {
    const candidate = join(dirname(path), name)
    let original
    try { original = await readArchive(candidate) } catch { continue }
    try { if (moduleState(asarHeader(original).module) !== 'available') continue }
    catch { continue }
    if (digest(rewriteArchive(original)) === digest(actual)) return candidate
  }
  return undefined
}
export async function inspect(options = {}) {
  const archive = await locateArchive(options)
  let bytes
  try { bytes = await readArchive(archive) }
  catch (error) {
    if (error.code === 'ENOENT') return { state: 'not-found', archive, canRestore: false }
    throw error
  }
  const state = moduleState(asarHeader(bytes).module)
  const backup = state === 'applied' ? await matchingBackup(archive, bytes) : undefined
  const pending = await readPending(archive)
  const matchingPending = pending && pending.expectedSha === digest(bytes)
  if (matchingPending && scheduledIsLive(pending)) {
    return { state: 'scheduled', archive, canRestore: false, platform: options.platform ?? process.platform }
  }
  return { state, archive, canRestore: Boolean(backup),
    ...(matchingPending && pending.status === 'failed' ? { error: pending.error } : {}),
    ...(matchingPending && pending.status === 'scheduled'
      ? { error: pending.format === 1 ? '检测到旧版待应用操作，可重新应用。' : '上次延后应用进程已退出，可重新操作。' } : {}),
    platform: options.platform ?? process.platform }
}
function pendingPath(path, format = 2) {
  return format === 1 ? `${path}.dots-persistence-pending.json` : `${path}.dots-persistence-v2-pending.json`
}
function stagePath(path, expectedSha, format = 2) {
  const label = format === 1 ? 'dots-persistence-stage' : 'dots-persistence-v2-stage'
  return `${path}.${label}-${expectedSha.slice(0, 16)}`
}
function scheduledIsLive(record) {
  if (record?.status !== 'scheduled' || record.format === 1) return false
  const pid = record.helperPid ?? record.ownerPid
  if (!Number.isSafeInteger(pid) || pid <= 0) return false
  try { process.kill(pid, 0); return true }
  catch (error) { if (error.code === 'ESRCH') return false; if (error.code === 'EPERM') return true; throw error }
}

function awaitHelperReady(child, request, persistPid) {
  return new Promise((resolve, reject) => {
    const done = (error) => {
      clearTimeout(timer)
      child.off('spawn', onSpawn)
      child.off('error', done)
      child.off('exit', onExit)
      child.off('message', onMessage)
      error ? reject(error) : resolve()
    }
    const onExit = () => done(new Error('延后应用进程未就绪就退出；安装文件没有替换。'))
    const onMessage = message => { if (message?.type === 'ready' && message.request === request) done() }
    const onSpawn = async () => {
      try {
        await persistPid(child.pid)
        child.send({ type: 'prepare', request }, error => { if (error) done(error) })
      } catch (error) { done(error) }
    }
    const timer = setTimeout(() => done(new Error('延后应用进程未报告就绪；请重试。')), 12000)
    child.once('spawn', onSpawn)
    child.once('error', done)
    child.once('exit', onExit)
    child.on('message', onMessage)
  })
}

async function readPending(path) {
  for (const format of [2, 1]) {
    let contents
    try { contents = await readFile(pendingPath(path, format), 'utf8') }
    catch (error) { if (error.code === 'ENOENT') continue; throw error }
    try {
      const data = JSON.parse(contents)
      return data && typeof data === 'object' && !Array.isArray(data) ? { ...data, format } : { status: 'invalid', format }
    } catch (error) {
      if (error instanceof SyntaxError) return { status: 'invalid', format }
      throw error
    }
  }
  return null
}
async function clearPending(path, record) {
  // Disarm the old helper first. It only knows its original record/stage filenames.
  const format = record?.format ?? 2
  await unlink(pendingPath(path, format)).catch(error => { if (error.code !== 'ENOENT') throw error })
  const prefix = format === 1 ? 'dots-persistence-stage' : 'dots-persistence-v2-stage'
  const stages = record?.status === 'invalid'
    ? (await readdir(dirname(path))).filter(name => name.startsWith(`${basename(path)}.${prefix}-`)
      && /\.dots-persistence(?:-v2)?-stage-[a-f0-9]{16}$/u.test(name)).map(name => join(dirname(path), name))
    : record && typeof record.expectedSha === 'string' && /^[a-f0-9]{64}$/u.test(record.expectedSha)
      && record.stage === stagePath(path, record.expectedSha, format) ? [record.stage] : []
  for (const stage of stages) {
    await unlink(stage).catch(error => { if (error.code !== 'ENOENT') throw error })
  }
}
async function retryLegacy(path, expected, payload, pending, platform) {
  if (pending?.format !== 1 || pending.status !== 'scheduled' || pending.expectedSha !== digest(expected)) return undefined
  // While an older helper could be finishing, supersede only an identical repair.
  if (pending.resultSha !== digest(payload)) throw new Error('旧版待应用操作与当前修改不同，请先完全退出 DSH。')
  await clearPending(path, pending)
  if (platform === 'win32') return scheduleAfterExit(path, expected, payload)
  return undefined
}
/** Schedule one operation when Windows keeps the active ASAR open. An IPC disconnect
 * from the DSH Host triggers it after application exit, without a polling service. */
const deferredSchedules = new Map()
async function scheduleAfterExit(path, expected, payload) {
  const running = deferredSchedules.get(path)
  if (running) { await running.catch(() => {}); return scheduleAfterExit(path, expected, payload) }
  const launching = launchAfterExit(path, expected, payload)
  deferredSchedules.set(path, launching)
  try { return await launching }
  finally { deferredSchedules.delete(path) }
}
async function launchAfterExit(path, expected, payload) {
  const sha = digest(expected)
  const stage = stagePath(path, sha)
  const pending = { archive: path, stage, expectedSha: sha, resultSha: digest(payload),
    status: 'scheduled', request: randomUUID(), ownerPid: process.pid }
  const existing = await readPending(path)
  if (existing?.expectedSha === sha && scheduledIsLive(existing)) {
    if (existing.resultSha === pending.resultSha) {
      return { state: 'scheduled', archive: path, changed: false, restartRequired: true, canRestore: false }
    }
    // A different operation against this very same archive may still be waiting for exit.
    throw new Error('已有一项针对当前 DSH 安装文件的操作排队等待退出')
  }
  if (existing) await clearPending(path, existing)
  // A previous interrupted write may have left its own staged file behind.
  await unlink(stage).catch(error => { if (error.code !== 'ENOENT') throw error })
  await writeFile(stage, payload, { flag: 'wx' })
  let child
  try {
    if (digest(await readArchive(stage)) !== pending.resultSha) throw new Error('延后应用文件校验失败')
    await writeFile(pendingPath(path), JSON.stringify(pending), { flag: 'wx' })
    child = spawn(process.execPath, [fileURLToPath(new URL('./persistence-after-exit.mjs', import.meta.url)), pendingPath(path), pending.request], {
      detached: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, windowsHide: true,
    })
    await awaitHelperReady(child, pending.request, async helperPid => {
      await writeFile(pendingPath(path), JSON.stringify({ ...pending, helperPid }))
    })
    child.channel?.unref()
    child.unref()
  } catch (error) {
    // A child cannot apply an operation while its parent IPC is still connected.
    // Stop this exact child before removing its staged request.
    child?.kill()
    await unlink(pendingPath(path)).catch(() => {})
    await unlink(stage).catch(() => {})
    throw error
  }
  return { state: 'scheduled', archive: path, changed: true, restartRequired: true, canRestore: false }
}
/** Called once by the detached helper when its parent DSH process exits. */
export async function finishScheduled(path, request) {
  const pending = JSON.parse(await readFile(path, 'utf8'))
  const format = pending.request ? 2 : 1
  if (pending.status !== 'scheduled' || path !== pendingPath(pending.archive, format) || (pending.request && pending.request !== request)) throw new Error('待应用修复记录不匹配')
  const expected = await readArchive(pending.archive)
  const actual = digest(expected)
  if (actual !== pending.resultSha) {
    if (actual !== pending.expectedSha) throw new Error('DSH 已更新，已放弃旧版本的待应用修复')
    const patched = await readArchive(pending.stage)
    if (digest(patched) !== pending.resultSha) throw new Error('待应用修复内容校验失败')
    await replaceAndVerify(pending.archive, expected, patched)
  }
  await unlink(pending.stage).catch(() => {})
  await unlink(path).catch(() => {})
}
async function ensureWritableMac(options) {
  if ((options.platform ?? process.platform) !== 'darwin' || options.unsignedMac === true) return
  const exe = options.executable ?? process.execPath
  try {
    execFileSync('codesign', ['-dv', exe], { stdio: 'ignore' })
  } catch { return } // Unsigned developer build
  throw new Error('此 macOS 应用带有系统代码签名，修改 app.asar 会使签名失效')
}
export async function replaceAndVerify(path, expected, payload, verifyInstalled = readArchive) {
  const staged = `${path}.dots-stage-${process.pid}-${Date.now()}`
  const displaced = `${path}.dots-replaced-${process.pid}-${Date.now()}`
  let originalMoved = false
  let replacementMoved = false
  let installed = false
  try {
    await writeFile(staged, payload, { flag: 'wx' })
    if (digest(await readArchive(staged)) !== digest(payload)) throw new Error('临时文件写入校验失败')
    if (digest(await readArchive(path)) !== digest(expected)) throw new Error('DSH 安装文件已变动，未执行替换')
    await rename(path, displaced)
    originalMoved = true
    await rename(staged, path)
    replacementMoved = true
    if (digest(await verifyInstalled(path)) !== digest(payload)) throw new Error('安装文件替换后的校验失败')
    installed = true
  } catch (error) {
    if (originalMoved) {
      try {
        if (replacementMoved) await unlink(path)
        await rename(displaced, path)
        originalMoved = false
      } catch (restoreError) {
        // Keep the displaced original and its path available for recovery.
        throw new AggregateError([error, restoreError], `安装文件替换失败，原版保存在 ${displaced}`)
      }
    }
    throw error
  } finally {
    await unlink(staged).catch(() => {})
    if (installed) await unlink(displaced).catch(() => {})
  }
}
export async function applyPersistence(options = {}) {
  const archive = await locateArchive(options)
  await ensureWritableMac(options)
  const original = await readArchive(archive)
  const state = moduleState(asarHeader(original).module)
  if (state === 'applied') return { state: 'applied', archive, canRestore: Boolean(await matchingBackup(archive, original)), changed: false, restartRequired: false }
  if (state !== 'available') throw new Error('当前 DSH Desktop 浏览器代码未匹配到修复目标')
  const pending = await readPending(archive)
  if (pending?.expectedSha === digest(original) && scheduledIsLive(pending)) {
    return { state: 'scheduled', archive, changed: false, restartRequired: true, canRestore: false }
  }
  const patched = rewriteArchive(original)
  const backup = join(dirname(archive), `${BACKUP_PREFIX}${digest(original).slice(0, 16)}`)
  try { await copyFile(archive, backup, constants.COPYFILE_EXCL) }
  catch (error) { if (error.code !== 'EEXIST') throw error }
  if (digest(await readArchive(backup)) !== digest(original)) throw new Error('已有备份与当前 DSH 版本不匹配，未修改安装文件')
  const retry = await retryLegacy(archive, original, patched, pending, options.platform ?? process.platform)
  if (retry) return retry
  try { await replaceAndVerify(archive, original, patched) }
  catch (error) {
    if ((options.platform ?? process.platform) === 'win32' && ['EBUSY', 'EPERM'].includes(error.code)) {
      return scheduleAfterExit(archive, original, patched)
    }
    throw error
  }
  const oldPending = await readPending(archive)
  if (oldPending) await clearPending(archive, oldPending)
  return { state: 'applied', archive, backup, canRestore: true, changed: true, restartRequired: true }
}
export async function restorePersistence(options = {}) {
  const archive = await locateArchive(options)
  await ensureWritableMac(options)
  const patched = await readArchive(archive)
  if (moduleState(asarHeader(patched).module) !== 'applied') throw new Error('当前 DSH Desktop 未应用 Dots 持久化修复')
  const pending = await readPending(archive)
  if (pending?.expectedSha === digest(patched) && scheduledIsLive(pending)) {
    return { state: 'scheduled', archive, changed: false, restartRequired: true, canRestore: false }
  }
  const backup = await matchingBackup(archive, patched)
  if (!backup) throw new Error('找不到与当前安装版本匹配的原版备份')
  const original = await readArchive(backup)
  const retry = await retryLegacy(archive, patched, original, pending, options.platform ?? process.platform)
  if (retry) return retry
  try { await replaceAndVerify(archive, patched, original) }
  catch (error) {
    if ((options.platform ?? process.platform) === 'win32' && ['EBUSY', 'EPERM'].includes(error.code)) {
      return scheduleAfterExit(archive, patched, original)
    }
    throw error
  }
  const oldPending = await readPending(archive)
  if (oldPending) await clearPending(archive, oldPending)
  return { state: 'available', archive, backup, canRestore: false, changed: true, restartRequired: true }
}
