/** Test-only synthetic conversation. Never bundled or counted as real Dots service coverage. */
export function createMockDotPage(React, client) {
 const { createElement:h, useState } = React
 const copy = {
  mockLabel:'模拟 Dot · 仅供测试', mockNotice:'这是隔离测试回复，不连接 ChatGPT、真实 Dot 或账户。',
  mockYou:'你', mockAssistant:'模拟 Dot', mockPlaceholder:'输入一条测试消息…', mockSend:'发送', mockBusy:'回复中…'
 }
 const t = key => copy[key] ?? key
function MockDotConversation({ backend, t }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const send = async e => {
    e.preventDefault()
    if (busy || !draft.trim()) return
    const text = draft.trim()
    setDraft('')
    setError('')
    setBusy(true)
    setMessages(old => [...old, { id: `u-${old.length}`, kind: 'user', text }])
    try {
      const response = await backend.reply({ text })
      const body = String(response?.text ?? '')
      if (!body) throw new Error('Mock backend returned an empty response')
      setMessages(old => [...old, { id: `d-${old.length}`, kind: 'dot', text: body }])
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }
  return h(React.Fragment, null,
    h('p', { className: 'dotsTestNote' }, t('mockNotice')),
    h('section', { className: 'dotsDemo', 'data-testid': 'mock-conversation' },
      h('div', { className: 'dotsMessages', 'aria-live': 'polite' }, messages.map(message =>
        h('div', { key: message.id, className: `dotsMessage ${message.kind === 'user' ? 'dotsMessageUser' : 'dotsMessageFake'}` },
          h('b', null, message.kind === 'user' ? t('mockYou') : t('mockAssistant')), ': ', message.text))),
      error ? h('p', { role: 'alert', className: 'dotsProblem', 'data-testid': 'mock-error' }, error) : null,
      h('form', { className: 'dotsInputRow', onSubmit: send },
        h('input', { className: 'dotsInput', type: 'text', 'aria-label': t('mockPlaceholder'),
          placeholder: t('mockPlaceholder'), value: draft, onChange: e => setDraft(e.target.value), disabled: busy }),
        h('button', { className: 'dotsButton dotsButtonPrimary', type: 'submit', disabled: busy || !draft.trim() },
          busy ? t('mockBusy') : t('mockSend')))))
}


 return function MockDotsTestPage({ __testDotsBackend: backend, ...props }) {
  if (backend === undefined) return h(client.DotsPage, props)
  return h('main', {className:'dotsPage'},
   h('header', {className:'dotsToolbar'}, h('span', {className:'dotsBrandName'}, 'Dots'),
    h('span', {className:'dotsMockBadge', 'data-testid':'mock-badge'}, t('mockLabel'))),
   h(MockDotConversation, {backend, t}))
 }
}
