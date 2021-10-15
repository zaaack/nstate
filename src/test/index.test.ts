import { NanoState } from '..'
import { deepEqual } from 'assert'
import { renderHook } from '@testing-library/react-hooks'
interface State {
  counter: number
  deep: {
    aa: number
    bb: { cc: string }
  }
}
class Counter extends NanoState<State> {
  setCounter(value: number) {
    this.setState({ counter: value })
  }
  setCounterByDraft(value: number) {
    this.setStateByDraft(draft => {
      draft.counter = value
    })
  }
  setDeepCc(value: string) {
    this.setState({
      deep: {
        ...this.state.deep,
        bb: { cc: value },
      },
    })
  }
  setDeepCcByDraft(value: string) {
    this.setStateByDraft(draft => {
      draft.deep.bb.cc = value
    })
  }
}
describe('test setState', () => {
  it('setState', () => {
    const counter = new Counter({
      counter: 0,
      deep: {
        aa: 0,
        bb: { cc: 'cc' },
      },
    })
    const initialState: State = JSON.parse(JSON.stringify(counter.state))
    console.log('counter.state', counter.state)
    counter.setCounter(1)
    console.log('counter.state', counter.state)
    deepEqual(counter.state.counter, 1, '1')
    deepEqual(counter.state.deep, initialState.deep, '2')
    counter.setDeepCc('ccc')
    deepEqual(counter.state.counter, 1, '3')
    deepEqual(counter.state.deep.aa, 0, '4')
    deepEqual(counter.state.deep.bb.cc, 'ccc', '5')
  })
  it('setStateByDraft', () => {
    const counter = new Counter({
      counter: 0,
      deep: {
        aa: 0,
        bb: { cc: 'cc' },
      },
    })
    const initialState: State = JSON.parse(JSON.stringify(counter.state))
    deepEqual(counter.state.counter, 0, '1')
    counter.setCounterByDraft(1)
    deepEqual(counter.state.counter, 1, '2')
    deepEqual(counter.state.deep, initialState.deep, '3')
    deepEqual(counter.state.deep.bb.cc, 'cc', '4')
    counter.setDeepCcByDraft('ccc')
    deepEqual(counter.state.deep.bb.cc, 'ccc', '5')
  })

  it('watch', async () => {
    const counter = new Counter({
      counter: 0,
      deep: {
        aa: 0,
        bb: { cc: 'cc' },
      },
    })
    let countChanged = 0
    let countChanges = [] as number[]
    counter.watch(s=> s.counter, (v) => {
      countChanged++
      countChanges.push(v)
    })
    let [aaChanged, aaChanges] = [0, [] as number[]]
    counter.watch(s=> s.deep.aa, (v) => {
      aaChanged++
      aaChanges.push(v)
    })
    let [ccChanged, ccChanges] = [0, [] as string[]]
    counter.watch(s=> s.deep.bb.cc, (v) => {
      ccChanged++
      ccChanges.push(v)
    })
    counter.setCounter(1)
    const getCallState = () => {
      return {
        countChanged,
        countChanges,
        aaChanged,
        aaChanges,
        ccChanged,
        ccChanges,
      }
    }
    deepEqual(getCallState(), {
      countChanged: 1,
      countChanges: [1],
      aaChanged: 0,
      aaChanges: [],
      ccChanged: 0,
      ccChanges: [],
    }, '1')
    counter.setCounterByDraft(2)
    deepEqual(getCallState(), {
      countChanged: 2,
      countChanges: [1, 2],
      aaChanged: 0,
      aaChanges: [],
      ccChanged: 0,
      ccChanges: [],
    }, '2')

    counter.setDeepCcByDraft('ccc')
    deepEqual(getCallState(), {
      countChanged: 2,
      countChanges: [1, 2],
      aaChanged: 0,
      aaChanges: [],
      ccChanged: 1,
      ccChanges: ['ccc'],
    }, '3')
  })

  it('useState', async () => {
    const counter = new Counter({
      counter: 0,
      deep: {
        aa: 0,
        bb: { cc: 'cc' },
      },
    })
    let count = renderHook(() => counter.useState(s => s.counter))
    deepEqual(count.result.current, 0, '1')
    counter.setCounter(1)
    deepEqual(count.result.current, 1, '2')
  })
})
