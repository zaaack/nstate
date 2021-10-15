import mitt from 'mitt'
import { useEffect, useState } from 'react'
import immer, { setAutoFreeze } from 'immer'
import { shallowEqualArrays, shallowEqualObjects } from 'shallow-equal'

setAutoFreeze(false)
type Patch<T> = Partial<T> | ((s: T) => Partial<T>)
export interface Options {
  name?: string
  debug?: boolean
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
      this._options = { name }
    } else if (name) {
      this._options = name
    }
  }

  protected setState(patch: Patch<T>) {
    if (typeof patch === 'function') {
      patch = patch(this.state)
    }
    let old = this.state
    this.state = { ...this.state, ...patch }
    this.events.emit('change', { patch, old })
    if (this._options.debug) {
      const storeName = this.constructor.name + (this._options.name ? '-' + this._options.name : '')
      console.log(`%c[${storeName}] before:`, `color:#c2c217;`, old)
      console.log(`\n%c[${storeName}] changed:`, 'color:#19c217;', patch)
      console.log(`\n%c[${storeName}] after:`, 'color:#17aac2;', this.state)
    }
  }
  /**
   * using immer under the hood
   * @param draft
   */
  protected setStateByDraft(draft: (draft: T) => void) {
    this.setState(immer(this.state, draft))
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
