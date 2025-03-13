
export function bindInstance(
  ins: any,
  excludeFns: string[] = [],
  handle: (actionCall: () => any| Promise<any>, fn: Function, args: any[]) => void,
  debug = false
) {
  let parent = ins
  let binded = excludeFns.reduce((acc, fn) => {
    acc[fn] = true
    return acc
  }, {})
  while (parent) {
    Object.getOwnPropertyNames(parent).forEach((key) => {
      if (typeof ins[key] === 'function' && key !== 'constructor' && !binded[key]) {
        if (debug) {
          console.log('[nstate] autoBind', key)
        }
        let old = ins[key]
        binded[key] = true
        ins[key] = (...args) => {
          const call = () => old.apply(ins, args)
          return handle(call, old, args)
        }
      }
    })
    parent = Object.getPrototypeOf(parent)
  }
}
