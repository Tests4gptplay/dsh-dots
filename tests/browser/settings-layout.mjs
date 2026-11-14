/** Controlled RPC fixture; renders the shipped React Settings, never a hand-drawn UI. */
import React from 'react'
import { createRoot } from 'react-dom/client'
let client
window.__ModuleLoader__ = { load({ factory }) { client = factory(() => React) } }
window.__DSH_DIRECTORY_PICKER__ = { pick: async () => 'C:\\Selected\\tunnel-client' }
window.mountDotsSettings = (language = 'zh', desktop = false) => {
  const calls = []
  const mcp = { enabled: false, running: false, port: 0, publicOrigin: '', localUrl: '', tools: [] }
  const notify = { enabled: false, active: false, sessions: [], types: [], subscriptionCount: 0 }
  const tunnel = { running: false, installed: false, installDirectory: 'C:\\Users\\Example\\.dsh\\profiles\\desktop\\dsh-dots\\tunnel-client', executable: '', tunnelId: '', health: null }
  const respond = (kind, data) => async (method, payload = {}) => {
    calls.push({ kind, method, payload })
    if (method === 'configure') Object.assign(data, payload)
    if (kind === 'mcp') data.running = data.enabled
    if (method === 'start') Object.assign(data, { running: true, health: null })
    if (method === 'stop') Object.assign(data, { running: false })
    return { ...data }
  }
  createRoot(document.getElementById('app')).render(React.createElement(client.DotsPersistenceSettings, {
    t: key => client[language][key] ?? key, desktop,
    rpc: async () => ({ state: 'available', archive: 'C:\\DSH\\resources\\app.asar' }),
    mcpRpc: respond('mcp', mcp), tunnelRpc: respond('tunnel', tunnel), notifyRpc: respond('notify', notify),
  }))
  window.dotsUiFixture = { calls, mcp, notify, tunnel }
}
