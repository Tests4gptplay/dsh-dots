import { mkdir, readFile, writeFile } from 'node:fs/promises'
await mkdir('lib', { recursive: true })
const css = (await readFile('src/styles.css', 'utf8')).replace(/\r\n/g, '\n')
const client = await readFile('src/client.js', 'utf8')
const wrapper = `window.__ModuleLoader__.load({ id: 'dsh-dots', factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;\nconst __DOTS_CLIENT_CSS__ = ${JSON.stringify(css)};\n${client}\nreturn module.exports; } });\n`
const host = await readFile('src/host.mjs', 'utf8')
await writeFile('lib/client.js', wrapper)
await writeFile('lib/host.js', host)
console.log('DSH Dots: generated native host/client bundles.')
