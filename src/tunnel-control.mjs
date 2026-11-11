/** Owns only the official tunnel-client installation and processes launched by this plugin. */
import { createHash, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { access, chmod, mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { unzipSync } from 'fflate'

const RELEASE_URL = 'https://api.github.com/repos/openai/tunnel-client/releases/latest'
export const TUNNEL_LINKS = Object.freeze({
  settings: 'https://platform.openai.com/settings/organization/tunnels',
  keys: 'https://platform.openai.com/settings/organization/api-keys',
  download: 'https://github.com/openai/tunnel-client/releases/latest',
  guide: 'https://developers.openai.com/api/docs/guides/secure-mcp-tunnels',
})
export function selectTunnelAsset(release, platform = process.platform, arch = process.arch) {
  const os = { win32: 'windows', linux: 'linux', darwin: 'darwin' }[platform] ?? platform
  const cpu = { x64: 'amd64', arm64: 'arm64' }[arch] ?? arch
  const name = `tunnel-client-${release.tag_name}-${os}-${cpu}.zip`
  const asset = release.assets?.find(item => item.name === name)
  if (!asset) throw new Error(`The official release has no ${name}. Select an existing tunnel-client executable instead.`)
  return asset
}
export function redactTunnelText(value, secrets = []) {
  let text = String(value ?? '')
  for (const secret of secrets.filter(Boolean).sort((a, b) => b.length - a.length)) text = text.split(secret).join('[redacted]')
  return text.replace(/\/mcp\/[A-Za-z0-9_-]+/g, '/mcp/[redacted]').replace(/\bsk-[A-Za-z0-9_-]+/g, '[runtime-key]')
}
export function extractTunnelArchive(bytes, destination) {
  const files = unzipSync(bytes)
  return (async () => {
    for (const [name, data] of Object.entries(files)) {
      // A downloaded archive must not write outside its selected installation directory.
      const normalized = name.replaceAll('\\', '/')
      const target = resolve(destination, normalized), rel = relative(destination, target)
      if (isAbsolute(normalized) || /^[A-Za-z]:/.test(normalized) || rel === '..' || rel.startsWith('..' + sep)) {
        throw new Error(`Archive entry is outside the installation directory: ${name}`)
      }
      if (normalized.endsWith('/')) { await mkdir(target, { recursive: true }); continue }
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, data)
    }
  })()
}
/** Remove only directories created by the Dots installer; keep the active client and one previous copy.
 * An executable currently used by a running tunnel also stays until that process stops.
 */
const managedClientName = /^v\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?-(?:win32|linux|darwin)-(?:x64|arm64)-[0-9a-f]{8}$/
function managedClientDirectory(executable, root) {
  if (!executable || !['tunnel-client', 'tunnel-client.exe'].includes(basename(executable))) return ''
  const folder = dirname(resolve(executable))
  return dirname(folder) === resolve(root) && managedClientName.test(basename(folder)) ? folder : ''
}
export async function pruneTunnelInstallations(root, current, previous = '', running = '') {
  const base = resolve(root)
  const keep = new Set([current, previous, running].map(path => managedClientDirectory(path, base)).filter(Boolean))
  let entries
  try { entries = await readdir(base, { withFileTypes: true }) }
  catch (cause) { if (cause.code === 'ENOENT') return []; throw cause }
  const removed = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !managedClientName.test(entry.name)) continue
    const folder = join(base, entry.name)
    if (keep.has(folder)) continue
    // A matching directory must contain an official tunnel executable before removal.
    const executable = join(folder, entry.name.includes('-win32-') ? 'tunnel-client.exe' : 'tunnel-client')
    try { await access(executable) } catch { continue }
    await rm(folder, { recursive: true, force: true })
    removed.push(folder)
  }
  return removed
}

async function replaceJSON(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temporary = `${path}.${randomUUID()}.tmp`
  try { await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' }); await rename(temporary, path) }
  finally { await rm(temporary, { force: true }) }
}

export function createTunnelController({ dataDir, mcp, fetchImpl = fetch, spawnImpl = spawn,
  platform = process.platform, arch = process.arch, environment = process.env } = {}) {
  const root = resolve(dataDir), configFile = join(root, 'tunnel.json'), profileDir = join(root, 'tunnel-profiles')
  const profileFile = join(profileDir, 'dsh-dots.yaml')
  let prefs = { installDirectory: join(root, 'tunnel-client'), executable: '', previousExecutable: '', tunnelId: '' }
  let loaded, secret = '', runtime, operation, error = '', lastDiagnosis = null, health = null, disposed = false
  const clean = text => redactTunnelText(text, [secret, mcp.status().localUrl])
  const load = () => loaded ??= (async () => {
    try { const saved = JSON.parse(await readFile(configFile, 'utf8')); for (const key of Object.keys(prefs)) if (typeof saved[key] === 'string') prefs[key] = saved[key] }
    catch (cause) { if (cause.code !== 'ENOENT') throw cause }
  })()
  async function status() {
    await load()
    let installed = false
    if (prefs.executable) try { await access(prefs.executable); installed = true } catch {}
    return { ...prefs, installed, platform, arch, running: Boolean(runtime), pid: runtime?.child.pid ?? null,
      runningExecutable: runtime?.executable ?? '', pendingClientSwitch: Boolean(runtime && prefs.executable !== runtime.executable),
      state: runtime ? 'running' : operation ? operation.name : 'stopped', operation: operation?.name ?? '',
      keyAvailable: Boolean(secret || environment.CONTROL_PLANE_API_KEY), error, lastDiagnosis, health, links: TUNNEL_LINKS,
      profileDirectory: profileDir, targetAvailable: Boolean(mcp.status().localUrl) }
  }
  async function configure(patch = {}) {
    await load()
    const next = { ...prefs }
    for (const key of ['installDirectory', 'executable', 'tunnelId']) if (patch[key] !== undefined) {
      if (typeof patch[key] !== 'string') throw new TypeError(`${key} must be a string.`)
      next[key] = patch[key].trim()
    }
    if (!next.installDirectory) next.installDirectory = join(root, 'tunnel-client')
    next.installDirectory = resolve(next.installDirectory)
    if (next.executable) next.executable = resolve(next.executable)
    if (runtime && (next.executable !== prefs.executable || next.tunnelId !== prefs.tunnelId)) await stopProcess(false)
    await replaceJSON(configFile, next)
    prefs = next
    if (typeof patch.apiKey === 'string' && patch.apiKey.trim()) secret = patch.apiKey.trim()
    error = ''
    return status()
  }
  // Clean only after a successful download or after the old process exits.
  // Cleanup errors are reported, without undoing a successfully installed client.
  async function prune() {
    try { await pruneTunnelInstallations(prefs.installDirectory, prefs.executable, prefs.previousExecutable, runtime?.executable) }
    catch (cause) { error = clean('Old tunnel-client cleanup failed: ' + (cause.message ?? cause)) }
  }
  const env = () => ({ ...environment, CONTROL_PLANE_API_KEY: secret || environment.CONTROL_PLANE_API_KEY || '' })
  function command(executable, args, signal) {
    return new Promise((accept, reject) => {
      const child = spawnImpl(executable, args, { env: env(), windowsHide: true, shell: false, signal, stdio: ['ignore', 'pipe', 'pipe'] })
      let output = ''
      child.stdout?.on('data', chunk => { output += chunk.toString() })
      child.stderr?.on('data', chunk => { output += chunk.toString() })
      child.once('error', reject)
      child.once('close', (code, killedBy) => accept({ code, signal: killedBy, output: clean(output) }))
    })
  }
  async function task(name, action) {
    if (disposed) throw new Error('Dots has been unloaded.')
    if (operation) throw new Error(`The ${operation.name} operation is in progress; use Stop to cancel it.`)
    const current = { name, abort: new AbortController() }; operation = current; error = ''
    try { await load(); current.abort.signal.throwIfAborted(); await action(current.abort.signal) }
    catch (cause) { if (!current.abort.signal.aborted) error = clean(cause.message ?? cause); throw new Error(clean(cause.message ?? cause), { cause }) }
    finally { if (operation === current) operation = undefined }
    return status()
  }
  async function install(patch = {}, callerSignal) {
    return task('installing', async localSignal => {
      await configure(patch)
      localSignal.throwIfAborted()
      const signal = callerSignal ? AbortSignal.any([localSignal, callerSignal]) : localSignal
      const response = await fetchImpl(RELEASE_URL, { signal, headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'dsh-dots' } })
      if (!response.ok) throw new Error(`Official release lookup failed (HTTP ${response.status}).`)
      const release = await response.json(), asset = selectTunnelAsset(release, platform, arch)
      const download = new URL(asset.browser_download_url)
      if (download.origin !== 'https://github.com' || !download.pathname.startsWith('/openai/tunnel-client/releases/download/')) throw new Error('The release asset is not from openai/tunnel-client.')
      const archive = await fetchImpl(download.href, { signal })
      if (!archive.ok) throw new Error(`Official client download failed (HTTP ${archive.status}).`)
      const bytes = new Uint8Array(await archive.arrayBuffer())
      const digest = createHash('sha256').update(bytes).digest('hex')
      let expected = asset.digest?.replace(/^sha256:/, '')
      if (!expected) {
        const sumsAsset = release.assets.find(item => item.name === 'SHA256SUMS.txt')
        if (sumsAsset) {
          const sums = await fetchImpl(sumsAsset.browser_download_url, { signal })
          if (!sums.ok) throw new Error(`Official checksums unavailable (HTTP ${sums.status}).`)
          const line = (await sums.text()).split('\n').find(line => line.trim().split(/\s+/).at(-1)?.replace(/^\*/, '') === asset.name)
          expected = line?.trim().split(/\s+/)[0]
        }
      }
      if (!expected || digest !== expected) throw new Error('The download does not match the official SHA-256 checksum. The existing client was preserved.')
      await mkdir(prefs.installDirectory, { recursive: true })
      const temporary = await mkdtemp(join(prefs.installDirectory, '.dots-download-'))
      try {
        await extractTunnelArchive(bytes, temporary)
        signal.throwIfAborted()
        const executableName = platform === 'win32' ? 'tunnel-client.exe' : 'tunnel-client'
        const executable = join(temporary, executableName)
        await access(executable)
        if (platform !== 'win32') {
          await chmod(executable, 0o755)
          try { await chmod(join(temporary, 'cloudflared'), 0o755) } catch (cause) { if (cause.code !== 'ENOENT') throw cause }
        }
        const tested = await command(executable, ['--version'], signal)
        if (tested.code !== 0) throw new Error(tested.output || 'The downloaded client could not start.')
        const destination = join(prefs.installDirectory, `${release.tag_name}-${platform}-${arch}-${randomUUID().slice(0, 8)}`)
        signal.throwIfAborted()
        await rename(temporary, destination)
        const previousExecutable = managedClientDirectory(prefs.executable, prefs.installDirectory) ? prefs.executable : ''
        const next = { ...prefs, executable: join(destination, executableName), previousExecutable }
        try { await replaceJSON(configFile, next); prefs = next }
        catch (cause) { await rm(destination, { recursive: true, force: true }); throw cause }
        await prune()
        lastDiagnosis = { kind: 'installation', ok: true, output: tested.output, at: new Date().toISOString(), sha256: digest }
        return status()
      } finally { await rm(temporary, { recursive: true, force: true }) }
    })
  }
  async function prepare(signal) {
    if (!prefs.executable) throw new Error('Download the official client or select an existing executable.')
    if (!prefs.tunnelId) throw new Error('Enter the Tunnel ID from OpenAI Platform.')
    const target = mcp.status().localUrl
    if (!target) throw new Error('Enable MCP in Dots before starting the tunnel.')
    await mkdir(profileDir, { recursive: true, mode: 0o700 })
    const result = await command(prefs.executable, ['init', '--sample', 'sample_mcp_remote_no_auth', '--profile', 'dsh-dots',
      '--profile-dir', profileDir, '--tunnel-id', prefs.tunnelId, '--mcp-server-url', target,
      '--health-listen-addr', '127.0.0.1:0', '--control-plane-api-key-ref', 'env:CONTROL_PLANE_API_KEY', '--force'], signal)
    if (result.code !== 0) throw new Error(result.output || `Client initialization exited with ${result.code}.`)
    await chmod(profileFile, 0o600)
  }
  async function start(patch = {}) {
    return task('starting', async signal => {
      await configure(patch)
      signal.throwIfAborted()
      if (runtime) {
        if (runtime.executable === prefs.executable) return
        // An official download updates the selected binary; switch when the user presses Start.
        await stopProcess(false)
        signal.throwIfAborted()
      }
      await prepare(signal)
      signal.throwIfAborted()
      const healthFile = join(profileDir, `health-${randomUUID()}.url`)
      const child = spawnImpl(prefs.executable, ['run', '--profile-file', profileFile, '--health.url-file', healthFile],
        { env: env(), windowsHide: true, shell: false, detached: platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] })
      const current = { child, healthFile, closed: null, stopping: false, executable: prefs.executable }
      runtime = current; health = null; lastDiagnosis = null
      // Streams are drained. Details are read from the official client's health/doctor commands.
      let lastLine = ''
      const output = chunk => { lastLine = clean(chunk.toString().trim().split('\n').at(-1) ?? '') }
      child.stdout?.on('data', output); child.stderr?.on('data', output)
      current.closed = new Promise(resolve => {
        child.once('close', async (code, killedBy) => {
          if (runtime === current) {
            runtime = undefined; health = null
            if (!current.stopping && code !== 0) error = lastLine || `Tunnel client exited (${code ?? killedBy}).`
          }
          try {
            await rm(healthFile, { force: true }).catch(() => {})
            // A process may exit on its own; run the existing bounded-installation cleanup then too.
            await prune()
          } finally { resolve() }
        })
      })
      child.once('error', cause => { if (!current.stopping) error = clean(cause.message); if (runtime === current) runtime = undefined })
      await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject) })
      if (signal.aborted) { await stop(); signal.throwIfAborted() }
      return status()
    })
  }
  async function stopProcess(cancelOperation = true) {
    if (cancelOperation) operation?.abort.abort()
    const current = runtime
    if (!current) { health = null; lastDiagnosis = null; return }
    current.stopping = true
    if (platform === 'win32') {
      const result = await command('taskkill.exe', ['/PID', String(current.child.pid), '/T', '/F'])
      if (result.code !== 0 && current.child.exitCode === null) throw new Error(result.output || 'Could not stop the tunnel client.')
    } else {
      try { process.kill(-current.child.pid, 'SIGTERM') }
      catch (cause) { if (cause.code !== 'ESRCH') throw cause }
    }
    await current.closed
    if (runtime === current) runtime = undefined
    await prune()
    health = null; lastDiagnosis = null
  }
  async function stop() { await stopProcess(); return status() }
  async function diagnose(patch = {}) {
    return task('checking', async signal => {
      await configure(patch)
      signal.throwIfAborted()
      await prepare(signal)
      const result = await command(prefs.executable, ['doctor', '--profile-file', profileFile, '--json', '--explain'], signal)
      lastDiagnosis = { kind: 'doctor', ok: result.code === 0, ...result, at: new Date().toISOString() }
      return status()
    })
  }
  async function refresh() {
    await load()
    const current = runtime
    if (current) {
      try {
        const result = await command(current.executable, ['health', '--url-file', current.healthFile, '--json', '--require-control-plane-poll'])
        if (runtime === current) {
          let details; try { details = JSON.parse(result.output) } catch { details = { message: result.output } }
          health = { ok: result.code === 0, details, at: new Date().toISOString() }
        }
      } catch (cause) { if (runtime === current) health = { ok: false, details: { message: clean(cause.message) } } }
    }
    return status()
  }
  return { status, configure, install, start, stop, diagnose, refresh,
    isRunning: () => Boolean(runtime),
    suspend: () => stopProcess(),
    async dispose() { disposed = true; try { await stopProcess() } finally { secret = '' } } }
}

/** The native authenticated Settings transport owns these operations, not the public MCP endpoint. */
export function registerTunnelTransport(connection, controller) {
  const methods = ['status', 'configure', 'install', 'start', 'stop', 'diagnose', 'refresh']
  const disposers = methods.map(endpoint => {
    const method = 'dsh-dots-tunnel/' + endpoint
    return connection.fetch.register({ path: '/api/' + method, methods: ['POST'], requestBody: 'buffered',
      async fetch(request) {
        if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return new Response('Expected JSON', { status: 415 })
        let body; try { body = await request.json() } catch { return new Response('Invalid JSON', { status: 400 }) }
        if (body?.type !== 'client-request' || body.method !== method || typeof body.rpcId !== 'string' || !body.rpcId) return new Response('Invalid DSH request', { status: 400 })
        try {
          request.signal.throwIfAborted()
          const value = await controller[endpoint](body.payload ?? {}, request.signal)
          return Response.json({ type: 'server-response', rpcId: body.rpcId, result: { ok: true, value } })
        } catch (cause) {
          return Response.json({ type: 'server-response', rpcId: body.rpcId,
            result: { ok: false, error: { code: 'dsh_dots_tunnel', message: String(cause.message ?? cause), details: { issues: [] } } } })
        }
      } })
  })
  return async () => { for (const dispose of disposers.reverse()) await dispose() }
}
