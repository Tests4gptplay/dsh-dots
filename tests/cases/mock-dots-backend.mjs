/** Purely local imitation; never reaches ChatGPT or accesses credentials. */
export function createMockDotBackend({ failWhen = '模拟失败', prefix = '【模拟 Dot 回复】', delayMs = 0 } = {}) {
  let calls = 0
  return {
    get calls() { return calls },
    async reply({ text }) {
      calls += 1
      if (delayMs) await new Promise(resolve => setTimeout(resolve, delayMs))
      if (text.includes(failWhen)) throw new Error('模拟后端返回的测试错误')
      return { text: `${prefix}已收到：${text}` }
    },
  }
}
