import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve, basename } from 'node:path'
import { build } from 'esbuild'
import { nativeMcpBatchPolicy } from './mcp-sdk-build.mjs'
await mkdir('lib', { recursive: true })
const css = (await readFile('src/styles.css', 'utf8')).replace(/\r\n/g, '\n')
const client = await readFile('src/client.js', 'utf8') + '\n' + await readFile('src/mcp-settings.js', 'utf8')
const packageName = JSON.parse(await readFile('package.json', 'utf8')).name
const wrapper = `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageName)}, factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;\nconst __DOTS_CLIENT_CSS__ = ${JSON.stringify(css)};\n${client}\nreturn module.exports; } });\n`
await writeFile('lib/client.js', wrapper)
await writeFile('lib/host.js', await readFile('src/host.mjs', 'utf8'))
for (const name of ['persistence.mjs', 'persistence-after-exit.mjs', 'mcp-adapter.mjs', 'mcp-control.mjs']) {
  await writeFile('lib/' + name, await readFile('src/' + name, 'utf8'))
}
const bundled = await build({ entryPoints: ['src/mcp-server.mjs'], outfile: 'lib/mcp-server.mjs',
  plugins: [nativeMcpBatchPolicy], bundle: true, platform: 'node', format: 'esm', target: 'node20', minify: true, metafile: true,
  legalComments: 'none', banner: { js: '// Bundled dependencies and licenses: THIRD-PARTY-NOTICES.txt\nimport { createRequire as __dotsCreateRequire } from "node:module"; const require = __dotsCreateRequire(import.meta.url);' },
})
const packages = new Map()
for (const input of Object.keys(bundled.metafile.inputs)) {
  if (!input.includes('node_modules/')) continue
  let directory = dirname(resolve(input))
  while (basename(directory) !== 'node_modules' && directory !== dirname(directory)) {
    try {
      const pkg = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
      if (pkg.name) { packages.set(pkg.name, { directory, pkg }); break }
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    directory = dirname(directory)
  }
}
const notices = ['DSH Dots 2.0.0 — bundled third-party licenses',
  'The MCP protocol module bundles the packages below. DSH Dots source remains under its repository LICENSE.\n',
  'Build adaptation: the SDK legacy batch-count constant uses Number.MAX_SAFE_INTEGER. Protocol parsing is unchanged.\n']
for (const [name, { directory, pkg }] of [...packages].sort(([a], [b]) => a.localeCompare(b))) {
  notices.push(`\n${'='.repeat(72)}\n${name} ${pkg.version}\nLicense: ${pkg.license ?? 'see below'}\n`)
  const files = (await readdir(directory)).filter(file => /^(LICENSE|LICENCE|NOTICE)(\.|$)/i.test(file)).sort()
  if (!files.length) throw new Error(`License text missing for bundled ${name}`)
  for (const file of files) notices.push(`${file}\n${await readFile(join(directory, file), 'utf8')}\n`)
}
await writeFile('THIRD-PARTY-NOTICES.txt', notices.join('\n'))
console.log(`DSH Dots: generated Host/Client and optional MCP bundle (${packages.size} dependency license records).`)
