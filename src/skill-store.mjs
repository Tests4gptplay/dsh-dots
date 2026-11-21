// Troubleshooting records are local reference data, never executable instructions.
import { randomUUID } from 'node:crypto'
import { mkdir, open, lstat, rename, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'

export const skillFieldLimits = Object.freeze({ title: 120, symptom: 600, resolution: 2400, verification: 1000, scope: 300, query: 300 })
const FILE = 'dot-mcp-skills.json'
const MAX_RECORDS = 100
const MAX_BYTES = 2 * 1024 * 1024
const pendingWrites = new Map()
const idPattern = /^[a-z0-9][a-z0-9_-]{0,95}$/u
const contentFields = ['title', 'symptom', 'resolution', 'verification', 'scope']

// Start empty. Built-in entries, if supplied by a future release, stay read-only.
const builtInSkills = Object.freeze([])

const secretPatterns = [
  /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/iu,
  /\b(?:sk-(?:proj-|svcacct-|admin-)?[a-z0-9_-]{16,}|gh[pousr]_[a-z0-9_]{20,}|github_pat_[a-z0-9_]{20,}|xox[baprs]-[a-z0-9-]{10,}|(?:AKIA|ASIA)[A-Z0-9]{16})\b/iu,
  /\bBearer\s+[a-z0-9_.=+/-]{10,}/iu,
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@/iu,
  /[?&#](?:access_token|refresh_token|api[_-]?key|token|password|secret|signature|sig|session[_-]?id)=[^&\s#]{6,}/iu,
  /(?:^|[\s'"{,;])(?:[A-Z0-9]+[_-])*(?:password|passwd|access[_-]?token|refresh[_-]?token|session[_-]?token|api[_-]?key|client[_-]?secret|secret[_-]?key|authorization|cookie|token|secret)["']?\s*[:=]\s*["']?[^\s"',;<>\x60]{8,}/iu,
  /(?:密码|口令|私钥|密钥|令牌)\s*[：:=]\s*[^\s"',;<>\x60]{8,}/u,
]

function fail(code, message) {
  return Object.assign(new Error(message), { code })
}
function normalize(value) { return value.normalize('NFKC').toLowerCase() }
function validateId(id) {
  if (typeof id !== 'string' || !idPattern.test(id)) throw fail('SKILL_INVALID_INPUT', 'Invalid skill ID.')
  return id
}
function validateFields(entry) {
  if (!entry || typeof entry !== 'object') throw fail('SKILL_INVALID_INPUT', 'A skill record is required.')
  return Object.fromEntries(contentFields.map(field => {
    const raw = field === 'scope' ? entry[field] ?? '' : entry[field]
    if (typeof raw !== 'string') throw fail('SKILL_INVALID_INPUT', `${field} must be text.`)
    const value = raw.trim()
    if ((!value && field !== 'scope') || value.length > skillFieldLimits[field] || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) {
      throw fail('SKILL_INVALID_INPUT', `${field} must be ${field === 'scope' ? 'at most' : '1–'} ${skillFieldLimits[field]} characters of plain text.`)
    }
    if (secretPatterns.some(pattern => pattern.test(value))) {
      throw fail('SKILL_SECRET', `${field} appears to contain a credential or private key. Redact it before saving.`)
    }
    return [field, value]
  }))
}
function summary({ id, title, symptom, scope, builtIn, updatedAt }) {
  return { id, title, symptom, scope, builtIn, updatedAt }
}

// Match full query or distinct words anywhere in the fields. For Chinese/Japanese
// free text with no whitespace, fall back to short matching character pairs;
// prefer exact phrases and identifiers above partial matches.
function match(entry, query) {
  if (!query) return 1
  const title = normalize(entry.title)
  const symptom = normalize(entry.symptom)
  const haystack = normalize([entry.id, ...contentFields.map(key => entry[key])].join(' '))
  if (title.includes(query)) return 10
  if (symptom.includes(query)) return 8
  if (haystack.includes(query)) return 6
  const terms = query.split(/[^\p{L}\p{N}_-]+/u).filter(Boolean)
  if (!terms.length) return 0
  const slots = []
  for (const term of terms) {
    if (haystack.includes(term)) {
      slots.push(2)
      continue
    }
    const runs = term.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) ?? []
    const required = runs.filter(run => !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(run))
    if (required.some(run => !haystack.includes(run))) return 0
    const pairs = [...new Set(runs.flatMap(run => {
      const chars = Array.from(run)
      if (chars.length < 2 || !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(run)) return []
      return chars.slice(0, -1).map((char, index) => char + chars[index + 1])
    }))]
    const hits = pairs.filter(pair => haystack.includes(pair)).length
    if (!hits || (required.length === 0 && hits < Math.max(1, Math.ceil(pairs.length / 3)))) return 0
    slots.push(1)
  }
  return Math.min(5, slots.reduce((a, b) => a + b, 0))
}

function serialize(key, operation) {
  const next = (pendingWrites.get(key) ?? Promise.resolve()).catch(() => {}).then(operation)
  pendingWrites.set(key, next)
  const cleanup = () => { if (pendingWrites.get(key) === next) pendingWrites.delete(key) }
  next.then(cleanup, cleanup)
  return next
}

export function createSkillStore({ directory } = {}) {
  if (typeof directory !== 'string' || !directory.trim()) throw new TypeError('A local skill directory is required.')
  const location = resolve(directory, FILE)
  const corrupt = () => fail('SKILL_STORE_CORRUPT', 'The skill store is unreadable or invalid. Existing records were not overwritten.')
  const seeds = new Map(builtInSkills.map(record => [record.id, record]))
  async function readRecords() {
    let handle
    try {
      const metadata = await lstat(location)
      if (!metadata.isFile() || metadata.size > MAX_BYTES) throw corrupt()
      handle = await open(location, 'r')
    } catch (error) {
      if (error.code === 'ENOENT') return []
      throw error
    }
    try {
      const data = Buffer.alloc(MAX_BYTES + 1)
      let bytesRead = 0
      while (bytesRead < data.length) {
        const result = await handle.read(data, bytesRead, data.length - bytesRead, bytesRead)
        if (!result.bytesRead) break
        bytesRead += result.bytesRead
      }
      if (bytesRead > MAX_BYTES) throw corrupt()
      const { version, records } = JSON.parse(data.subarray(0, bytesRead).toString('utf8'))
      if (version !== 1 || !Array.isArray(records) || records.length > MAX_RECORDS) throw corrupt()
      const seen = new Set(seeds.keys())
      return records.map(record => {
        const id = validateId(record.id)
        if (seen.has(id) || record.builtIn !== false
          || typeof record.updatedAt !== 'string' || !Number.isFinite(Date.parse(record.updatedAt))) throw corrupt()
        seen.add(id)
        return { id, ...validateFields(record), builtIn: false, updatedAt: record.updatedAt }
      })
    } catch {
      throw corrupt()
    } finally {
      await handle.close()
    }
  }
  async function writeRecords(records) {
    const data = JSON.stringify({ version: 1, records }, null, 2) + '\n'
    if (records.length > MAX_RECORDS || Buffer.byteLength(data) > MAX_BYTES) {
      throw fail('SKILL_STORE_FULL', 'The local skill store is full. Update an existing record or remove an unused one first.')
    }
    await mkdir(resolve(directory), { mode: 0o700, recursive: true })
    const tmp = location + '.' + randomUUID() + '.tmp'
    let handle
    try {
      handle = await open(tmp, 'wx', 0o600)
      await handle.writeFile(data, 'utf8')
      await handle.sync()
      await handle.close()
      handle = undefined
      await rename(tmp, location)
    } finally {
      if (handle) await handle.close().catch(() => {})
      await unlink(tmp).catch(() => {})
    }
  }
  return {
    async list({ query = '' } = {}) {
      if (typeof query !== 'string' || query.length > skillFieldLimits.query) throw fail('SKILL_INVALID_INPUT', 'Invalid skill search query.')
      const validQuery = normalize(query.trim())
      return [...builtInSkills, ...await readRecords()]
        .map(record => ({ record, score: match(record, validQuery) }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score || (b.record.updatedAt ?? '').localeCompare(a.record.updatedAt ?? ''))
        .map(({ record }) => summary(record))
    },
    async read({ id } = {}) {
      validateId(id)
      const record = seeds.get(id) ?? (await readRecords()).find(record => record.id === id)
      return record ? { ...record } : null
    },
    async save(input) {
      const fields = validateFields(input)
      const id = input.id === undefined ? undefined : validateId(input.id)
      if (id !== undefined && seeds.has(id)) throw fail('SKILL_READ_ONLY', 'Built-in skills cannot be changed.')
      return serialize(location, async () => {
        const records = await readRecords()
        const existing = records.find(record => id === undefined
          ? normalize(record.title) === normalize(fields.title) && normalize(record.scope) === normalize(fields.scope)
          : record.id === id)
        const record = { id: id ?? existing?.id ?? randomUUID(), ...fields, builtIn: false, updatedAt: new Date().toISOString() }
        await writeRecords(existing ? records.map(item => item.id === existing.id ? record : item) : [...records, record])
        return { ...record }
      })
    },
    async remove({ id } = {}) {
      validateId(id)
      if (seeds.has(id)) throw fail('SKILL_READ_ONLY', 'Built-in skills cannot be removed.')
      return serialize(location, async () => {
        const records = await readRecords()
        const remaining = records.filter(record => record.id !== id)
        if (remaining.length === records.length) return false
        await writeRecords(remaining)
        return true
      })
    },
  }
}
