/** Test-only minimal React element + hook renderer, not part of the plugin package. */
export function createTestReact(onUpdate = () => {}) {
  const instances = new Map()
  const effectCleanups = []
  let runEffects = false
  let active = null
  let hookIndex = 0
  const Fragment = Symbol('TestFragment')
  const React = {
    Fragment,
    createElement(type, props, ...children) {
      return { type, props: { ...props, children: children.length < 2 ? children[0] : children } }
    },
    useRef(initial) {
      if (active === null) throw new Error('useRef requires a rendered function component')
      const key = active
      let state = instances.get(key)
      if (!state) { state = []; instances.set(key, state) }
      const index = hookIndex++
      if (!Object.hasOwn(state, index)) state[index] = { current: initial }
      return state[index]
    },
    // Synthetic VNode tests have no real DOM lifecycle. Effects stay inert
    // unless a test explicitly drives mount/unmount through runEffects().
    useEffect(callback, _deps) {
      hookIndex++
      if (!runEffects || active === null) return
      const cleanup = callback()
      if (typeof cleanup === 'function') effectCleanups.push(cleanup)
    },
    useState(initial) {
      if (active === null) throw new Error('useState requires a rendered function component')
      const key = active
      let state = instances.get(key)
      if (!state) { state = []; instances.set(key, state) }
      const index = hookIndex++
      if (!Object.hasOwn(state, index)) state[index] = typeof initial === 'function' ? initial() : initial
      const setState = next => {
        state[index] = typeof next === 'function' ? next(state[index]) : next
        queueMicrotask(onUpdate)
      }
      return [state[index], setState]
    },
  }
  function expand(node, path = 'root') {
    if (node === null || node === undefined || typeof node === 'boolean') return null
    if (Array.isArray(node)) return node.map((child, index) => expand(child, `${path}/${index}`))
    if (typeof node === 'string' || typeof node === 'number') return node
    if (node.type === Fragment) return expand(node.props.children, `${path}/fragment`)
    if (typeof node.type === 'function') {
      const before = active
      const beforeIndex = hookIndex
      active = `${path}/${node.type.name}`
      hookIndex = 0
      const child = node.type(node.props)
      active = before
      hookIndex = beforeIndex
      return expand(child, `${path}/${node.type.name}`)
    }
    const props = { ...node.props }
    props.children = expand(props.children, `${path}/${node.type}`)
    return { type: node.type, props }
  }
  return {
    React, expand, effectCleanups,
    /** Render one component as a mounted tree: its effects run for real. */
    mount(component, props) {
      runEffects = true
      const before = active
      const beforeIndex = hookIndex
      active = '/mounted'
      hookIndex = 0
      try { return component(props) } finally { active = before; hookIndex = beforeIndex; runEffects = false }
    },
    unmount() { for (const cleanup of effectCleanups.splice(0).reverse()) cleanup() },
  }
}

export function flatten(tree) {
  if (tree === null || tree === undefined) return []
  if (Array.isArray(tree)) return tree.flatMap(flatten)
  if (typeof tree !== 'object') return []
  return [tree, ...flatten(tree.props?.children)]
}
