/** Test-only minimal React element + hook renderer, not part of the plugin package. */
export function createTestReact(onUpdate = () => {}) {
  const instances = new Map()
  let active = null
  let hookIndex = 0
  const Fragment = Symbol('TestFragment')
  const React = {
    Fragment,
    createElement(type, props, ...children) {
      return { type, props: { ...props, children: children.length < 2 ? children[0] : children } }
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
  return { React, expand }
}

export function flatten(tree) {
  if (tree === null || tree === undefined) return []
  if (Array.isArray(tree)) return tree.flatMap(flatten)
  if (typeof tree !== 'object') return []
  return [tree, ...flatten(tree.props?.children)]
}
