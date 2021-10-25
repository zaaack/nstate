import Combine from './Combine'
import Counter from './Counter'
import CounterWithLocalStore from './CounterWithLocalStore'
import Nest from './Nest'

function App() {
  return (
    <div>
      <Counter />
      <Nest />
      <Combine />
      <CounterWithLocalStore />
    </div>
  )
}

export default App
