import mitt from 'mitt'
import React, { createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import immer, { freeze, setAutoFreeze as immerSetAutoFreeze } from 'immer'
import { shallowEqualArrays, shallowEqualObjects } from 'shallow-equal'
import { bindInstance } from './bind-instance'
import { logAction } from './log'
export { setUseProxies } from 'immer'

export type Patch<T> = Partial<T> | ((s: T) => Partial<T> | void)
export type WatchHandler<U> = (newState: U, oldState: U) => void

let defaultAutoFreeze = true
/**
 * Pass true to automatically freeze all copies created by Immer. Always freeze by default, even in production mode
 * @param freeze
 */
export function setAutoFreeze(freeze: boolean) {
  immerSetAutoFreeze(freeze)
  defaultAutoFreeze = freeze
}
export interface Options {
  name?: string
  debug?: boolean
  /** autoFreeze state, enabled by default, you can disable in production mode for better performance */
  autoFreeze?: boolean
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
const makeSymbol = (s: string) => {
  if (typeof Symbol !== 'undefined') {
    return Symbol(s)
  }
  return `__NSTATE_SYMBOL_${s}__`
}
const handlerWrapperSymbol = makeSymbol('handler-wrapper')

export default class NState<S> {
  protected events = mitt<{
    change: { patch: any; old: S }
  }>()
  private _options: Options = { debug: defaultDebug, autoFreeze: defaultAutoFreeze }

  constructor(protected state: S, name?: string | Options) {
    if (typeof name === 'string') {
      this._options.name = name
    } else if (name) {
      this._options = {
        ...this._options,
        ...name,
      }
    }
    bindInstance(
      this,
      Object.getOwnPropertyNames(NState.prototype),
      this._options.debug
        ? (call, action, args) => {
            const storeName = `${this.constructor.name}-${this._options.name || 'default'}`
            let oldState = this.state
            Promise.resolve(call()).then(() => {
              logAction(storeName, action, args, oldState, this.state)
            })
          }
        : undefined,
    )
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
    if (typeof old !== 'object' || typeof old === 'function' || old === null) {
      // scalar or function
      this.state = patch as any
    } else {
      if (typeof patch === 'function') {
        this.state = { ...old, ...immer(this.state, patch) }
      } else {
        this.state = { ...this.state, ...patch }
        if (this._options.autoFreeze) {
          this.state = freeze(this.state, true)
        }
      }
    }
    this.events.emit('change', { patch, old })
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
      } else if (
        typeof newState === 'object' &&
        newState !== null &&
        typeof oldState === 'object' &&
        oldState !== null
      ) {
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
    let old = useRef(this.state)
    useEffect(() => {
      this.watch(getter, handler)
      let oldState = getter(old.current)
      let newState = getter(this.state)
      if (newState !== oldState) {
        handler(newState, oldState)
      }
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
   * bind state to form input component with value/onChange/defaultValue
   * @param getter
   * @param key
   * @returns
   */
  useBind<U>(getter: (s: S) => U) {
    const s = this.useState(getter) || ({} as U)
    return <K extends keyof U>(
      key: K,
      transformer: (v: any) => U[K] = (f) => f as any,
      {
        valueKey,
        onChangeKey,
      }: {
        valueKey?: string
        onChangeKey?: string
      } = {},
    ) => {
      let isBool = typeof s[key] === 'boolean'
      return {
        [valueKey || (isBool ? 'checked' : 'value')]: s[key],
        [onChangeKey || 'onChange']: (e: any) => {
          this.setState((d) => {
            const value =
              (isBool
                ? e?.target?.checked ?? e?.target?.value
                : e?.target?.value ?? e?.target?.checked) ?? e
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
export function useLocalStore<T, U = {}>(
  state: T,
  actions: (store: LocalStore<T>) => U = (s) => ({} as U),
) {
  let store = useMemo(() => {
    let store = new LocalStore(state)
    return Object.assign(store, actions(store))
  }, [])
  const s = store.useState((s) => s)
  return [s, store] as const
}
