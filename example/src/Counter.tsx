import NState, { setDebug } from '../../src'
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
