/** One-shot DSH-quit fallback for an archive currently locked by Windows. */
import { readFile, writeFile } from 'node:fs/promises'
import { finishScheduled } from './persistence.mjs'
const [manifest, request] = process.argv.slice(2)
if (!manifest) process.exit(2)
const finish = () => {
  void finishScheduled(manifest, request).catch(async error => {
    process.exitCode = 1
    try {
      const data = JSON.parse(await readFile(manifest, 'utf8'))
      if (data.request === request) await writeFile(manifest, JSON.stringify({ ...data, status: 'failed', error: String(error.message ?? error) }))
    } catch { /* Failed report write must not conceal the failed operation. */ }
  })
}
// New helpers apply only after the requesting Host has persisted this PID and armed the
// exact request over IPC. A crash before that point leaves a safely retryable record.
if (request) {
  let armed = false
  process.on('message', async message => {
    if (armed || message?.type !== 'prepare' || message.request !== request) return
    try {
      const data = JSON.parse(await readFile(manifest, 'utf8'))
      if (!process.connected || data.request !== request || data.helperPid !== process.pid || data.status !== 'scheduled') return
      armed = true
      process.send({ type: 'ready', request }, () => {})
    } catch { /* The waiting Host reports a pre-readiness failure on this exact request. */ }
  })
  process.once('disconnect', () => { if (armed) finish() })
} else if (process.connected) process.once('disconnect', finish)
else finish() // Compatibility for a previously staged request.
