
export function bindInstance(
  ins: any,
  excludeFns: string[] = [],
  log?: (actionCall: () => void, fn: Function, args: any[]) => void,
) {
  let parent = ins
  let binded = excludeFns.reduce((acc, fn) => {
    acc[fn] = true
    return acc
  }, {})
  while (parent) {
    Object.getOwnPropertyNames(parent).forEach((key) => {
      if (typeof ins[key] === 'function' && key !== 'constructor' && !binded[key]) {
        if (log) {
          console.log('[nstate] autoBind', key)
        }
        let old = ins[key]
        binded[key] = true
        ins[key] = (...args) => {
          if (!log) return old.apply(ins, args)
          let ret
          log(() => (ret = old.apply(ins, args)), old, args)
          return ret
        }
      }
    })
    parent = Object.getPrototypeOf(parent)
  }
}
