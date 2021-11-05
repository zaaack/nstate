export function logAction<T>(storeName: string,action: Function, args: any[], oldState: T, newState: T, ) {
  console.log(`%c[${storeName}] before:`, `color:#c2c217;`, oldState)
  console.log(
    `\n%c[${storeName}] action:`,
    'color:#19c217;',
    `${action.name}(`,
    ...args
      .slice(0, action.length)
      .map((s) => {
        if (typeof s !== 'object' && typeof s !== 'function') {
          s = JSON.stringify(s)
        }
        return s
      })
      .concat(')'),
  )
  console.log(`\n%c[${storeName}] after:`, 'color:#17aac2;', newState)
}
