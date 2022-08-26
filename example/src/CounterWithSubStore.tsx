import NState, { LocalStore, setDebug } from '../../src'
import React from 'react'

setDebug(true) // enable debug log

interface State {
  counter1: number
  counter2: number
}
export class Store extends NState<State> {}
export const store = new Store({
  // initial state
  counter1: 1,
  counter2: 1,
})

function SubCounter({ store }: { store: LocalStore<State['counter1']> }) {
  let count = store.useState((s) => s)
  return (
    <div>
      <div>
        <h2>SubCounter</h2>
        <p>count: {count}</p>
        <button onClick={() => store.setState((s) => s + 1)}>+</button>
        <button onClick={() => store.setState((s) => s - 1)}>-</button>
        <button onClick={(e) => store.setState(0)}>reset</button>
      </div>
    </div>
  )
}
function CounterWithSubStore() {
  const subStore1 = store.useSubStore(
    (s) => s.counter1,
    (s, u) => {
      s.counter1 = u
      return s
    },
  )
  const subStore2 = store.useSubStore(
    (s) => s.counter2,
    (s, u) => {
      s.counter2 = u
      return s
    },
  )
  return (
    <div>
      <h1>SubStore</h1>
      <SubCounter store={subStore1} />
      <SubCounter store={subStore2} />
    </div>

  )
}
export default CounterWithSubStore
