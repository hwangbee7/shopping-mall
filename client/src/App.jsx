import { BrowserRouter as Router } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import './App.css'

// 라우팅은 AppRoutes에서 정의 (/, /orders, /orders/:id, /order, /order/success 등)
function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}

export default App
