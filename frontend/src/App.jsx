import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import PortfolioXRay from './pages/PortfolioXRay.jsx'
import FirePlanner from './pages/FirePlanner.jsx'
import MoneyHealth from './pages/MoneyHealth.jsx'

export default function App() {
  const [page, setPage] = useState('dashboard')

  const pages = {
    dashboard: Dashboard,
    portfolio: PortfolioXRay,
    fire: FirePlanner,
    health: MoneyHealth,
  }

  const PageComponent = pages[page] || Dashboard

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar active={page} onNavigate={setPage} />
      <main style={{ marginLeft: 240, flex: 1, padding: '36px 40px', minHeight: '100vh', maxWidth: 'calc(100vw - 240px)' }}>
        <PageComponent onNavigate={setPage} />
      </main>
    </div>
  )
}
