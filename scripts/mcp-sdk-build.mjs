/** Keep the SDK's legacy protocol parser while removing its fixed batch-count quota. */
import { readFile } from 'node:fs/promises'

export const nativeMcpBatchPolicy = {
  name: 'native-mcp-batch-policy',
  setup(build) {
    build.onLoad({ filter: /@modelcontextprotocol[/\\]server[/\\]dist[/\\]index\.mjs$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8')
      // This is a build-time source adaptation, not a runtime version check.
      // A changed SDK parser is reviewed during a dependency update.
      const declaration = /const MAX_BATCH_SIZE = \d+;/g
      if ([...source.matchAll(declaration)].length !== 1) throw new Error('Review the MCP SDK batch adapter for this dependency build.')
      return { contents: source.replace(declaration, 'const MAX_BATCH_SIZE = Number.MAX_SAFE_INTEGER;'), loader: 'js' }
    })
  },
}
