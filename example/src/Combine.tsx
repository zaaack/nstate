import NState, { setDebug } from '../../src'
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

export const nestStore = new CombineStore({ // optional initial state
  nest: {aa: 'aa', bb: 'bb'},
})

function Combine() {
  // use state by destructuring, support array/object
  const [aa, bb] = nestStore.useState(s => [s.nest.aa, s.nest.bb])
  // or:
  // const {aa, bb} = nestStore.useState(s => ({aa: s.nest.aa, bb: s.nest.bb}))
  const inp1Ref = React.useRef<HTMLInputElement>(null)
  const inp2Ref = React.useRef<HTMLInputElement>(null)
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
