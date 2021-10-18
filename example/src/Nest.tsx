import NState, { setDebug } from '../../src'
import React from 'react'

setDebug(true) // enable debug log

interface Store {
  nest: {
    aa: string
  }
}
export class NestStore extends NState<Store> {

  updateNest(aa: string) {
    // setState by immer draft (using immer under the hood)
    this.setState(draft => {
      draft.nest.aa = aa
    })
  }
}

export const nestStore = new NestStore({ // optional initial state
  nest: {aa: 'aa'},
})

function Nest() {
  const aa = nestStore.useState(s => s.nest.aa)
  const inpRef = React.useRef<HTMLInputElement>(null)
  return (
    <div>
      <div>
        <h2>Nest</h2>
        <p>aa: {aa}</p>
        <input ref={inpRef} type="text" defaultValue={aa}/>
        <button
          onClick={e => {
            nestStore.updateNest(inpRef.current?.value || '')
          }}
        >
          set
        </button>
      </div>
    </div>
  )
}

export default Nest
