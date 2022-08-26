# nstate

[![publish](https://github.com/zaaack/nstate/actions/workflows/publish.yml/badge.svg)](https://github.com/zaaack/nstate/actions/workflows/publish.yml) [![npm](https://img.shields.io/npm/v/nstate.svg)](https://www.npmjs.com/package/nstate) [![npm](https://img.shields.io/npm/dm/nstate.svg)](https://www.npmjs.com/package/nstate) [![size](https://badgen.net/bundlephobia/minzip/nstate)](https://bundlephobia.com/package/nstate)

A simple but powerful react state management library with low mental load, inspired by [rko](https://github.com/steveruizok/rko).

> nstate = nano state / next state

## Contents

- [nstate](#nstate)
  - [Contents](#contents)
  - [Features](#features)
  - [Install](#install)
  - [API](#api)
  - [Usage](#usage)
    - [1. Counter example](#1-counter-example)
    - [2. Bind state field to form input with onChange/value` with type safety](#2-bind-state-field-to-form-input-with-onchangevalue-with-type-safety)
    - [3. Combine multiple store to reuse actions/views](#3-combine-multiple-store-to-reuse-actionsviews)
    - [4. useLocalStore](#4-uselocalstore)
    - [5. useSubStore](#5-usesubstore)
  - [License](#license)

## Features

* Simple API with low mental load
* Powerful features based on concise API.
* Auto bind action methods
* Combine stores and reuse actions/views
* Watch store changes
* Shipped with [immer](https://immerjs.github.io/immer/) for nested state updating
* Bind state field to form input with value/onChange/defaultValue
* Flexible, you can customize all internal methods by override.


## Install

```sh
yarn add nstate # or npm i nstate
```


## API

```ts
export function setDebug(boolean):void // enable debug log

export default class NState<T> {
  protected state<T>
  protected events: Emitter<{
    change: { patch: any, old: T }
  }> // internal change events
  constructor(initialState: T, nameOrOptions?: string | { name: string, debug: boolean})
  protected onInit()
  protected setState(patch: Partial<T>)
  protected setState(patch: (s: T) => Partial<T>)
  protected setState(patch: (draft: T) => void) // using immer under the hood
  watch<U>(getter: (s: T) => U, handler: (s: U) => void) // Watch deep state change, if getter return a new array(length <= 20) or object, it will be shallow equals
  unwatch<U>(handler: (s: U) => void) // remove watch listener
  useWatch<U>(getter: (s: T) => U, handler: (s: U) => void, deps?: any[]) // watch hooks wrapper for auto remove handler after unmount and auto update when deps changes
  useState<U>(getter: (s: T) => U): U // use state hook, based on `watch`, so you can return a new array/object for destructuring.
  useBind<U>(getter: (s: T) => U): <K extends keyof U>(key: K, transformer?: (v: string) => U[K]) // bind state field to form input
  useSubStore<U>(getter: (s: T) => U, setter(s: T, u: U) => T) // create sub stores for get/set/watch, it will auto sync state to parent store
  dispose() // clear all event listeners, for sub stores/local stores
}

export function useLocalStore<T, U>(state: T, actions: (store: LocalStore<T>) => U): [T, LocalStore<T> & U]
```
## Usage

### 1. Counter example

```tsx
import NState, { setDebug } from 'nstate'
import React from 'react'

setDebug(true) // enable debug log

interface Store {
  count: number
}
export class CounterStore extends NState<Store> {

  inc() {
    // setState by new state
    this.setState({ count: this.state.count + 1 })
  }

  dec() {
    // setState by updater function like React
    this.setState(s => ({ count: s.count - 1 }))
  }

  set(n: number) {
    // setState by immer draft (using immer under the hood)
    this.setState(draft => {
      draft.count = n
    })
  }
}

export const counterStore = new CounterStore({ // optional initial state
  count: 0,
})

function Counter({ store = counterStore }: { store?: CounterStore }) {
  const count = store.useState(s => s.count)
  const inpRef = React.useRef<HTMLInputElement>(null)
  return (
    <div>
      <div>
        <h2>Counter</h2>
        <p>count: {count}</p>
        <button onClick={store.inc}>+</button>
        <button onClick={store.dec}>-</button>
        <button onClick={e=>store.set(0)}>reset</button>
      </div>
    </div>
  )
}

export default Counter
```


### 2. Bind state field to form input with onChange/value` with type safety

```tsx
function Counter() {
  const count = counterStore.useState(s => s.count)
  const bind = counterStore.useBind(s => s) // you can also bind nested object with (s => s.xx.aa)
  return (
    <div>
      count: {count}
      <input type="text" {...bind('count', Number)} />
    </div>
  )
}

```

### 3. Combine multiple store to reuse actions/views

```tsx
import NState, { setDebug } from 'nstate'
import React from 'react'
import Counter, {CounterStore} from './Counter';

setDebug(true) // enable debug log
interface Store {
  nest: {
    aa: string,
    bb: string,
  }
}
export class CombineStore extends NState<Store> {

  counter = new CounterStore({ count: 1 })

  onInit() {
    // link to counter store by simple watch API
    this.counter.watch(s=> s.count, count => {
      this.updateAA('count changed:'+count)
    })
  }

  updateAA(aa: string) {
    this.setState(draft => {
      draft.nest.aa = aa
    })
  }
  updateBB(bb: string) {
    this.setState(draft => {
      draft.nest.bb = bb
    })
  }
}

export const nestStore = new CombineStore({ // initial state
  nest: {aa: 'aa', bb: 'bb'},
})

function Combine() {
  // use state by destructuring, support array/object
  const [aa, bb] = nestStore.useState(s => [s.nest.aa, s.nest.bb])
  // or:
  // const {aa, bb} = nestStore.useState(s => ({aa: s.nest.aa, bb: s.nest.bb}))
  const inp1Ref = React.useRef<HTMLInputElement>(null)
  const inp2Ref = React.useRef<HTMLInputElement>(null)
  // watch hooks wrapper for auto remove handler after unmount
  nestStore.useWatch(s => [s.nest.aa, s.nest.bb], [aa, bb] => {
    // do something when state changes
  })
  return (
    <div>
      <div>
        <h2>Combine</h2>
        <Counter store={nestStore.counter} />
        <p>aa: {aa}</p>
        <p>bb: {bb}</p>
        <input ref={inp1Ref} type="text" defaultValue={aa}/>
        <button
          onClick={e => {
            nestStore.updateAA(inp1Ref.current?.value || '')
          }}
        >
          set aa
        </button>
        <input ref={inp2Ref} type="text" defaultValue={bb}/>
        <button
          onClick={e => {
            nestStore.updateBB(inp2Ref.current?.value || '')
          }}
        >
          set bb
        </button>
      </div>
    </div>
  )
}

export default Combine
```

### 4. useLocalStore

```tsx
function CounterWithLocalStore() {
  const [count, store] = useLocalStore(0, store => ({
    inc: () => store.setState(s => s + 1),
    dec: () => store.setState(s => s - 1),
  }))
  return (
    <div>
      <div>
        <h2>Counter with useLocalStore</h2>
        <p>count: {count}</p>
        <button onClick={store.inc}>+</button>
        <button onClick={store.dec}>-</button>
        <button onClick={e=>store.setState(0)}>reset</button>
      </div>
    </div>
  )
}
```

### 5. useSubStore

```tsx
interface Store {
  counter1: {
    count: number
  }
  counter2: {
    count: number
  }
}
export class Store extends NState<Store> {

}
export const store = new Store({ // initial state
  counter1: {count: 1},
  counter2: {count: 1},
})

function SubCounter({ store }) {
  return (
    <div>
      <div>
        <h2>Counter with useLocalStore</h2>
        <p>count: {count}</p>
        <button onClick={store.setState(s => s.count++)}>+</button>
        <button onClick={store.setState(s => s.count--)}>-</button>
        <button onClick={e=>store.setState(s => {
          s.count = 0
        })}>reset</button>
      </div>
    </div>
  )
}
function Counter() {
  const subStore = store.useSubStore(s => s.counter1, (s, u) => { s.counter1 = u })
  return <SubCounter store={subStore} />
}
```

## License

MIT
