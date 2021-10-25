import mitt from 'mitt'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import immer, { setAutoFreeze } from 'immer'
import { shallowEqualArrays, shallowEqualObjects } from 'shallow-equal'

setAutoFreeze(false)
export type Patch<T> = Partial<T> | ((s: T) => Partial<T> | void)
export type WatchHandler<U> = (newState: U, oldState: U) => void
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

function bindClass(ins) {
  let parent = ins
  while (parent) {
    Object.getOwnPropertyNames(parent).forEach((key) => {
      if (typeof ins[key] === 'function' && key !== 'constructor') {
        ins[key] = ins[key].bind(ins)
      }
    })
    parent = Object.getPrototypeOf(parent)
  }
}

export default class NState<S> {
  protected events = mitt<{
    change: { patch: any; old: S }
  }>()
  private _options: Options = {}

  constructor(protected state: S, name?: string | Options) {
    if (typeof name === 'string') {
      this._options = { name, debug: defaultDebug }
    } else if (name) {
      this._options = {
        debug: defaultDebug,
        ...name,
      }
    }
    bindClass(this)
    setTimeout(() => {
      this.onInit()
    })
  }

  protected onInit() {}
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
  protected setState(patch: Patch<S>) {
    let old = this.state
    if (typeof old !== 'object' || typeof old === 'function') {
      this.state = patch as any
    } else {
      if (typeof patch === 'function') {
        this.state = { ...old, ...immer(this.state, patch) }
      } else {
        this.state = { ...this.state, ...patch }
      }
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
  watch<U>(getter: (s: S) => U, handler: WatchHandler<U>) {
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
      } else if (typeof newState === 'object' && newState !== null) {
        isChanged = !shallowEqualObjects(newState, oldState)
      } else {
        isChanged = newState !== oldState
      }
      if (isChanged) {
        handler(newState, oldState)
      }
    }
    handler[handlerWrapperSymbol] = diff
    this.events.on('change', diff)
  }

  unwatch<U>(handler: WatchHandler<U>) {
    this.events.off('change', handler[handlerWrapperSymbol])
  }
  /**
   * watch hooks wrapper for auto remove handler after unmount and auto update when deps changes
   * @param getter
   * @param handler
   * @param deps
   */
  useWatch<U>(getter: (s: S) => U, handler: WatchHandler<U>, deps: any[] = []) {
    useEffect(() => {
      this.watch(getter, handler)
      return () => {
        this.unwatch(handler)
      }
    }, deps)
  }
  /**
   * use deep state or construct
   * @param getter
   * @returns
   */
  useState<U>(getter: (s: S) => U, deps: any[] = []) {
    const [state, setState] = useState<U>(getter(this.state))
    this.useWatch(getter, setState, deps)
    return state
  }
  /**
   * return the reference of state, unlike useState, it won't refresh view when state changed
   * @param getter
   * @returns
   */
  useRef<U>(getter: (s: S) => U) {
    return getter(this.state)
  }
  /**
   * bind state to form input component with value/onChange/defaultValue
   * @param getter
   * @param key
   * @returns
   */
  useBind<U>(getter: (s: S) => U) {
    const s = this.useState(getter) || ({} as U)
    return <K extends keyof U>(key: K, transformer: (v: any) => U[K] = (f) => f as any) => {
      return {
        defaultValue: s[key],
        value: s[key],
        onChange: (e: any) => {
          this.setState((d) => {
            const value = ['checkbox', 'radio'].includes(e?.target?.type)
              ? e.target.checked
              : e?.target?.value ?? e
            getter(d)[key] = transformer(value)
          })
        },
      }
    }
  }
}

class LocalStore<S> extends NState<S> {
  setState(patch: Patch<S>) {
    super.setState(patch)
  }
}

/**
 * use local store and state
 * @param state
 * @returns
 */
export function useLocalStore<T, U>(state: T, actions: (store: LocalStore<T>) => U) {
  let store = useMemo(() => {
    let store = new LocalStore(state)
    return Object.assign(store, actions(store))
  }, [])
  const s = store.useState((s) => s)
  return [s, store] as const
}
