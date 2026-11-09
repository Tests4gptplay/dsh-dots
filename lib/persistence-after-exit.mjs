/** One-shot DSH-quit fallback for an archive currently locked by Windows. */
import { readFile, writeFile } from 'node:fs/promises'
import { finishScheduled } from './persistence.mjs'
const manifest = process.argv[2]
if (!manifest) process.exit(2)
const finish = () => {
  void finishScheduled(manifest).catch(async error => {
    try {
      const data = JSON.parse(await readFile(manifest, 'utf8'))
      await writeFile(manifest, JSON.stringify({ ...data, status: 'failed', error: String(error.message ?? error) }))
    } catch { /* Original archive remains in place on precondition failure. */ }
  }).finally(() => process.exit())
}
if (process.connected) process.once('disconnect', finish)
else finish() // Parent may exit before this helper finishes loading.
