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
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
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
  if (headerSize < 8 || headerSize > 64 * 1024 * 1024 || jsonSize < 2 || 16 + jsonSize > base || base > bytes.length) {
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
function once(source, needle) { return source.split(needle).length - 1 }
/** Require the bundled DesktopBrowserGuests source and its session allocator context. */
function moduleState(source) {
  const start = source.search(/(?:var\s+DesktopBrowserGuests\s*=\s*class|class\s+DesktopBrowserGuests)\b/u)
  if (start === -1) return 'incompatible'
  const endMarker = source.indexOf('//#endregion', start)
  const body = source.slice(start, endMarker > start ? endMarker : start + 14_000)
  const original = once(body, ORIGINAL)
  const patched = once(body, PATCHED)
  const context = body.includes('this.partitions.set(workspace, partition)') && body.includes('session.fromPartition(partition)')
  if (!context || original + patched !== 1) return 'incompatible'
  return patched === 1 ? 'applied' : 'available'
}
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
  const state = moduleState(module)
  const from = direction === 'apply' ? ORIGINAL : PATCHED
  const to = direction === 'apply' ? PATCHED : ORIGINAL
  if (state !== (direction === 'apply' ? 'available' : 'applied')) {
    throw new Error('DSH Desktop 浏览器分区代码与修复目标不匹配')
  }
  const changed = Buffer.from(module.replace(from, to))
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
  if (pending?.expectedSha === digest(bytes) && pending.status === 'scheduled') {
    return { state: 'scheduled', archive, canRestore: false, platform: options.platform ?? process.platform }
  }
  return { state, archive, canRestore: Boolean(backup),
    ...(pending?.expectedSha === digest(bytes) && pending.status === 'failed' ? { error: pending.error } : {}),
    platform: options.platform ?? process.platform }
}
function pendingPath(path) { return `${path}.dots-persistence-pending.json` }
async function readPending(path) {
  try { return JSON.parse(await readFile(pendingPath(path), 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return null; throw error }
}
/** Schedule one operation when Windows keeps the active ASAR open. An IPC disconnect
 * from the DSH Host triggers it after application exit, without a polling service. */
async function scheduleAfterExit(path, expected, payload) {
  const sha = digest(expected)
  const stage = `${path}.dots-persistence-stage-${sha.slice(0, 16)}`
  const pending = { archive: path, stage, expectedSha: sha, resultSha: digest(payload), status: 'scheduled' }
  const existing = await readPending(path)
  if (existing) {
    if (existing.status === 'scheduled' && existing.expectedSha === sha && existing.resultSha === pending.resultSha) {
      return { state: 'scheduled', archive: path, changed: false, restartRequired: true, canRestore: false }
    }
    if (existing.status === 'failed' && existing.expectedSha === sha) {
      await unlink(existing.stage).catch(() => {})
      await unlink(pendingPath(path))
    } else {
      throw new Error('存在另一项未完成的 DSH 安装文件修复，请先检查之前操作的结果')
    }
  }
  await writeFile(stage, payload, { flag: 'wx' })
  try {
    if (digest(await readArchive(stage)) !== pending.resultSha) throw new Error('延后应用文件校验失败')
    await writeFile(pendingPath(path), JSON.stringify(pending), { flag: 'wx' })
    const child = spawn(process.execPath, [fileURLToPath(new URL('./persistence-after-exit.mjs', import.meta.url)), pendingPath(path)], {
      detached: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, windowsHide: true,
    })
    await new Promise((resolve, reject) => {
      child.once('spawn', resolve)
      child.once('error', reject)
    })
    child.unref()
  } catch (error) {
    await unlink(pendingPath(path)).catch(() => {})
    await unlink(stage).catch(() => {})
    throw error
  }
  return { state: 'scheduled', archive: path, changed: true, restartRequired: true, canRestore: false }
}
/** Called once by the detached helper when its parent DSH process exits. */
export async function finishScheduled(path) {
  const pending = JSON.parse(await readFile(path, 'utf8'))
  if (pending.status !== 'scheduled' || path !== pendingPath(pending.archive)) throw new Error('待应用修复记录不匹配')
  const expected = await readArchive(pending.archive)
  if (digest(expected) !== pending.expectedSha) throw new Error('DSH 已更新，已放弃旧版本的待应用修复')
  const patched = await readArchive(pending.stage)
  if (digest(patched) !== pending.resultSha) throw new Error('待应用修复内容校验失败')
  await replaceAndVerify(pending.archive, expected, patched)
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
async function replaceAndVerify(path, expected, payload) {
  const staged = `${path}.dots-stage-${process.pid}-${Date.now()}`
  const displaced = `${path}.dots-replaced-${process.pid}-${Date.now()}`
  let moved = false
  try {
    await writeFile(staged, payload, { flag: 'wx' })
    if (digest(await readArchive(staged)) !== digest(payload)) throw new Error('临时文件写入校验失败')
    if (digest(await readArchive(path)) !== digest(expected)) throw new Error('DSH 安装文件已变动，未执行替换')
    await rename(path, displaced); moved = true
    try { await rename(staged, path); moved = false }
    catch (error) {
      await rename(displaced, path).catch(() => {})
      throw error
    }
    if (digest(await readArchive(path)) !== digest(payload)) throw new Error('安装文件替换后的校验失败')
  } finally {
    await unlink(staged).catch(() => {})
    if (!moved) await unlink(displaced).catch(() => {})
  }
}
export async function applyPersistence(options = {}) {
  const archive = await locateArchive(options)
  await ensureWritableMac(options)
  const original = await readArchive(archive)
  const state = moduleState(asarHeader(original).module)
  if (state === 'applied') return { state: 'applied', archive, canRestore: Boolean(await matchingBackup(archive, original)), changed: false, restartRequired: false }
  if (state !== 'available') throw new Error('当前 DSH Desktop 浏览器代码未匹配到修复目标')
  const patched = rewriteArchive(original)
  const backup = join(dirname(archive), `${BACKUP_PREFIX}${digest(original).slice(0, 16)}`)
  try { await copyFile(archive, backup, constants.COPYFILE_EXCL) }
  catch (error) { if (error.code !== 'EEXIST') throw error }
  if (digest(await readArchive(backup)) !== digest(original)) throw new Error('已有备份与当前 DSH 版本不匹配，未修改安装文件')
  try { await replaceAndVerify(archive, original, patched) }
  catch (error) {
    if ((options.platform ?? process.platform) === 'win32' && ['EBUSY', 'EPERM'].includes(error.code)) {
      return scheduleAfterExit(archive, original, patched)
    }
    throw error
  }
  return { state: 'applied', archive, backup, canRestore: true, changed: true, restartRequired: true }
}
export async function restorePersistence(options = {}) {
  const archive = await locateArchive(options)
  await ensureWritableMac(options)
  const patched = await readArchive(archive)
  if (moduleState(asarHeader(patched).module) !== 'applied') throw new Error('当前 DSH Desktop 未应用 Dots 持久化修复')
  const backup = await matchingBackup(archive, patched)
  if (!backup) throw new Error('找不到与当前安装版本匹配的原版备份')
  const original = await readArchive(backup)
  try { await replaceAndVerify(archive, patched, original) }
  catch (error) {
    if ((options.platform ?? process.platform) === 'win32' && ['EBUSY', 'EPERM'].includes(error.code)) {
      return scheduleAfterExit(archive, patched, original)
    }
    throw error
  }
  return { state: 'available', archive, backup, canRestore: false, changed: true, restartRequired: true }
}
