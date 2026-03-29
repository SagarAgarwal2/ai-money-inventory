import { Flame, HeartPulse, LayoutDashboard, Moon, Newspaper, ScanLine, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import CouplePlanner from './pages/CouplePlanner.jsx'
import Dashboard from './pages/Dashboard.jsx'
import FirePlanner from './pages/FirePlanner.jsx'
import MarketBlog from './pages/MarketBlog.jsx'
import MoneyHealth from './pages/MoneyHealth.jsx'
import PortfolioXRay from './pages/PortfolioXRay.jsx'
import StudentSipPlanner from './pages/StudentSipPlanner.jsx'
import TaxWizard from './pages/TaxWizard.jsx'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('amm_theme')
    const initialTheme = savedTheme === 'light' ? 'light' : 'dark'
    setTheme(initialTheme)
    document.documentElement.setAttribute('data-theme', initialTheme)
  }, [])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
    localStorage.setItem('amm_theme', nextTheme)
  }

  const pageTitles = {
    dashboard: 'Dashboard',
    portfolio: 'Portfolio X-Ray',
    fire: 'FIRE Planner',
    health: 'Money Health',
    taxWizard: 'Tax Wizard',
    couplePlanner: 'Couple Planner',
    studentSip: 'Student SIP Planner',
    blog: 'Market Blog',
  }

  const mobileNavItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'portfolio', label: 'X-Ray', icon: ScanLine },
    { id: 'fire', label: 'FIRE', icon: Flame },
    { id: 'health', label: 'Health', icon: HeartPulse },
    { id: 'blog', label: 'Blog', icon: Newspaper },
  ]

  const pages = {
    dashboard: Dashboard,
    portfolio: PortfolioXRay,
    fire: FirePlanner,
    health: MoneyHealth,
    taxWizard: TaxWizard,
    couplePlanner: CouplePlanner,
    studentSip: StudentSipPlanner,
    blog: MarketBlog,
  }

  const PageComponent = pages[page] || Dashboard

  return (
    <div className="app-shell">
      <Sidebar active={page} onNavigate={setPage} />
      <main className="app-main">
        <header className="topbar">
          <div>
            <p className="topbar-kicker">AI Money Mentor</p>
            <h1 className="topbar-title">{pageTitles[page] || 'Dashboard'}</h1>
          </div>
          <div className="topbar-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <div className="live-badge" aria-label="Live market status">
              <span className="live-dot" />
              Live Market
            </div>
          </div>
        </header>
        <PageComponent onNavigate={setPage} />
      </main>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {mobileNavItems.map(({ id, label, icon: Icon }) => {
          const active = page === id
          return (
            <button key={id} className={`mobile-nav-item ${active ? 'active' : ''}`} onClick={() => setPage(id)}>
              <Icon size={16} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
