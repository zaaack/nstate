import mitt from 'mitt'
import React, { createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { freeze, setAutoFreeze as immerSetAutoFreeze, produce } from 'immer'
import { shallowEqualArrays, shallowEqualObjects } from 'shallow-equal'
import { logAction } from './log.js'
import { bindInstance } from './bind-instance.js'
export { setUseStrictShallowCopy } from 'immer'

export type Patch<T> = Partial<T> | ((s: T) => Partial<T> | void)
export type WatchHandler<U, S> = (newState: U, oldState: U, s:S) => void

let defaultAutoFreeze = false
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
export type Bind<U> = <K extends keyof U>(
  key: K,
  opts?:{
    fromValue?: (v: unknown) => U[K],
    toValue?:  (v: U[K]) => unknown,
  }
) => { value: any; onChange: (e: any) => void }
export default class Store<S> {
  protected events = mitt<{
    change: { patch: any; old: S }
  }>()
  protected state: S
  private _options: Options = { debug: defaultDebug, autoFreeze: defaultAutoFreeze }

  constructor(state?: S, name?: string | Options) {
    if (state) {
      this.state ??= state
    }
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
      Object.getOwnPropertyNames(Store.prototype),
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
        this.state = { ...old, ...produce(this.state, patch) }
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
  watch<U>(getter: (s: S) => U, handler: WatchHandler<U, S>) {
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
        try {
          handler(newState, oldState, this.state)
        } catch (error) {
          console.error(error)
        }
      }
    }
    handler[handlerWrapperSymbol] = diff
    this.events.on('change', diff)
  }

  unWatch<U>(handler: WatchHandler<U, S>) {
    this.events.off('change', handler[handlerWrapperSymbol])
  }
  /**
   * watch hooks wrapper for auto remove handler after unmount and auto update when deps changes
   * @param getter
   * @param handler
   * @param deps
   */
  useWatch<U>(getter: (s: S) => U, handler: WatchHandler<U, S>, deps: any[] = []) {
    let old = useRef(this.state)
    useEffect(() => {
      this.watch(getter, handler)
      let oldState = getter(old.current)
      let newState = getter(this.state)
      if (newState !== oldState) {
        handler(newState, oldState, this.state)
      }
      return () => {
        this.unWatch(handler)
      }
    }, deps)
  }
  /**
   * use deep state or construct
   * @param getter
   * @returns
   */
  useState(): S
  useState<U>(getter: (s: S) => U, deps?: any[]): U
  useState<U>(getter: (s: S) => U = s => s as any, deps: any[] = []): U {
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
  useBind(): Bind<S>;
  useBind<U>(getter: (s: S) => U): Bind<U>
  useBind<U>(getter?: (s: S) => U): Bind<U> {
    const s = this.useState(getter ||(f=>f as any)) || ({} as U)
    return (<K extends keyof U>(
      key: K,
      opts: Parameters<Bind<U>>[1] = {},
    ) => {
      const isBool = typeof s[key] === 'boolean'
      let onChange = (e: any) => {
        this.setState((d) => {
          const value =
            (isBool
              ? e?.target?.checked ?? e?.target?.value
              : e?.target?.value ?? e?.target?.checked) ?? e
          ;(getter?.(d) ?? (d as any as U))[key] =
            opts.fromValue ? opts.fromValue(value) : value
        })
      }
      let value = opts.toValue ? opts.toValue(s[key]) : s[key]
      return isBool
        ? ({
            checked: value,
            value,
            onChange,
          } as any)
        : {
            value,
            onChange,
          }
    })
  }
  /**
   * create sub store to get/set/watch, it will auto sync state to parent store
   * @param getter
   * @param setter
   * @deprecated
   * @returns
   */
  useSubStore<U>(getter: (s: S) => U, setter: (s: S, u: U) => S) {
    let state = this.useState(getter)
    let store = useMemo(() => {
      let _store = new LocalStore<U>(state)
      let isCycleChange = false
      _store.onInit = () => {
        _store.watch(
          (s) => s,
          (ss) => {
            if (!isCycleChange) {
              this.setState((s) => setter(s, ss))
            }
          },
        )
      }
      this.watch(getter, (s) => {
        isCycleChange = true
        _store.setState(s)
        isCycleChange = false
      })
      return _store
    }, [])
    useEffect(() => {
      return () => {
        store.dispose()
      }
    }, [])
    return store
  }
  /**
   * clear all event listeners
   */
  dispose() {
    this.events.all.clear()
  }
}
export { Store }
export class LocalStore<S> extends Store<S> {
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
  let store: LocalStore<T> & U = useMemo(() => {
    let storeInner = new LocalStore(state)
    return Object.assign(storeInner, actions(storeInner))
  }, [])
  const s:T = store.useState((s) => s)
  return [s, store] as const
}
