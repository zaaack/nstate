import mitt from 'mitt'
import { useEffect, useState } from 'react'
import immer, { setAutoFreeze } from 'immer'
import { shallowEqualArrays, shallowEqualObjects } from 'shallow-equal'

setAutoFreeze(false)
type Patch<T> = Partial<T> | ((s: T) => Partial<T> | void)
export interface Options {
  name?: string
  debug?: boolean
}

let defaultDebug = false
/**
 * set default debug option
 * @param debug
 * @returns
 */
export function setDebug(debug: boolean) {
  defaultDebug = debug
}

const handlerWrapperSymbol =
  typeof Symbol === 'undefined' ? '__HANDLER_WRAPPER__' : Symbol('handler-wrapper')

export class NanoState<T> {
  protected events = mitt<{
    change: { patch: any, old: T }
  }>()
  private _options: Options = {}

  constructor(public state: T, name?: string | Options) {
    if (typeof name === 'string') {
      this._options = { name, debug: defaultDebug }
    } else if (name) {
      this._options = {
        debug: defaultDebug,
        ...name,
      }
    }
  }
  /**
   * setState by partialState/updater/immer draft
   * @param patch
   * @example
   * state={aa:1, bb: 'aa', cc: { dd: 1 }}
   * // 1. partialState
   * this.setState({ aa: 2 }) // {aa:2, bb: 'aa', cc: { dd: 1 }}
   * // 2. updater
   * this.setState(s => ({ aa: s.aa+1 })) // {aa:3, bb: 'aa', cc: { dd: 1 }}
   * // 3. immer draft, for more plz see: https://immerjs.github.io/immer
   * this.setState(draft => {
   *    draft.cc.dd=2
   * }) // {aa:3, bb: 'aa', cc: { dd: 2 }}
   */
  protected setState(patch: Patch<T>) {
    let old = this.state
    if (typeof patch === 'function') {
      this.state = {...old, ...immer(this.state, patch)}
    } else {
      this.state = { ...this.state, ...patch }
    }
    this.events.emit('change', { patch, old })
    if (this._options.debug) {
      const storeName = this.constructor.name + (this._options.name ? '-' + this._options.name : '')
      console.log(`%c[${storeName}] before:`, `color:#c2c217;`, old)
      console.log(`\n%c[${storeName}] changed:`, 'color:#19c217;', patch)
      console.log(`\n%c[${storeName}] after:`, 'color:#17aac2;', this.state)
    }
  }

  /**
   * Watch deep state change, if getter return a new array(length <= 20) or object, it will be shallow equal
   * @param getter get deep state
   * @param handler handle deep state change
   */
  watch<U>(getter: (s: T) => U, handler: (s: U) => void) {
    const diff = ({ patch, old }) => {
      let newState = getter(this.state)
      let oldState = getter(old)
      let isChanged = false
      if (Array.isArray(newState) && Array.isArray(oldState)) {
        if (newState.length >= 20) {
          // >=20 don't shallow equal
          isChanged = newState !== oldState
        } else {
          isChanged = !shallowEqualArrays(newState, oldState)
        }
      } else if(typeof newState === 'object' && newState !== null) {
        isChanged = !shallowEqualObjects(newState, oldState)
      } else {
        isChanged = newState !== oldState
      }
      if (isChanged) {
        handler(newState)
      }
    }
    handler[handlerWrapperSymbol] = diff
    this.events.on('change', diff)
  }

  unwatch<U>(handler: (s: U) => void) {
    this.events.off('change', handler[handlerWrapperSymbol])
  }
  /**
   * use deep state or construct
   * @param getter
   * @returns
   */
  useState<U>(getter: (s: T) => U) {
    const [state, setState] = useState<U>(getter(this.state))
    useEffect(() => {
      this.watch(getter, setState)
      return () => this.unwatch(setState)
    }, [])
    return state
  }
}
