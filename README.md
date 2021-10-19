# nstate

[![publish](https://github.com/zaaack/nstate/actions/workflows/publish.yml/badge.svg)](https://github.com/zaaack/nstate/actions/workflows/publish.yml) [![npm](https://img.shields.io/npm/v/nstate.svg)](https://www.npmjs.com/package/nstate) [![npm](https://img.shields.io/npm/dm/nstate.svg)](https://www.npmjs.com/package/nstate)

A simple but powerful react state management library with low mental load, inspired by [rko](https://github.com/steveruizok/rko).

> nstate = nano state / next state

## Contents

- [nstate](#nstate)
  - [Contents](#contents)
  - [Features](#features)
  - [Install](#install)
  - [Usage](#usage)
    - [1. Counter example](#1-counter-example)
    - [2. Combine multiple store to reuse actions/views](#2-combine-multiple-store-to-reuse-actionsviews)
  - [API](#api)
  - [License](#license)

## Features

* Simple API with low mental load
* Powerful features based on concise API.
* Auto bind action methods
* Combine stores and reuse actions/views
* Watch store changes
* Shipped with [immer](https://immerjs.github.io/immer/) for nested state updating


## Install

```sh
yarn add nstate # or npm i nstate
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

### 2. Combine multiple store to reuse actions/views

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
    // setState by immer draft (using immer under the hood)
    this.setState(draft => {
      draft.nest.aa = aa
    })
  }
  updateBB(bb: string) {
    // setState by immer draft (using immer under the hood)
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
  useWatch<U>(getter: (s: T) => U, handler: (s: U) => void, deps?: any[]) // watch hooks wrapper for auto remove handler after unmount and auto update when deps changes
  useState<U>(getter: (s: T) => U): U // use state hook, based on `watch`, so you can return a new array/object for destructuring.
}
```

## License

MIT
