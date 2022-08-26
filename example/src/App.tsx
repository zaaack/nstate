import Combine from './Combine'
import Counter from './Counter'
import CounterWithLocalStore from './CounterWithLocalStore'
import CounterWithSubStore from './CounterWithSubStore'
import Nest from './Nest'

function App() {
  return (
    <div>
      <Counter />
      <Nest />
      <Combine />
      <CounterWithLocalStore />
      <CounterWithSubStore />
    </div>
  )
}

export default App
