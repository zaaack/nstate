import NState, { setDebug, useLocalStore } from '../../src'
import React from 'react'

setDebug(true) // enable debug log

interface Store {
  count: number
}


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

export default CounterWithLocalStore
