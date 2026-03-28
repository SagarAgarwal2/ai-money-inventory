import { Activity, ArrowRight, HeartPulse, Target, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { fmt, marketApi } from '../api/client.js'
import { Disclaimer, LoadingState, StatCard } from '../components/UI.jsx'

const COLORS = ['#1a56db', '#0d9f6e', '#d97706', '#7c3aed', '#e02424', '#0891b2']
const PORTFOLIO_STORAGE_KEY = 'amm_portfolio_analysis'
const FIRE_STORAGE_KEY = 'amm_fire_plan'
const HEALTH_STORAGE_KEY = 'amm_health_score'

export default function Dashboard({ onNavigate }) {
  const [portfolio, setPortfolio] = useState(null)
  const [health, setHealth] = useState(null)
  const [fire, setFire] = useState(null)
  const [market, setMarket] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const savedPortfolio = localStorage.getItem(PORTFOLIO_STORAGE_KEY)
      const savedHealth = localStorage.getItem(HEALTH_STORAGE_KEY)
      const savedFire = localStorage.getItem(FIRE_STORAGE_KEY)
      if (savedPortfolio) setPortfolio(JSON.parse(savedPortfolio))
      if (savedHealth) setHealth(JSON.parse(savedHealth))
      if (savedFire) setFire(JSON.parse(savedFire))
    } catch {
      localStorage.removeItem(PORTFOLIO_STORAGE_KEY)
      localStorage.removeItem(HEALTH_STORAGE_KEY)
      localStorage.removeItem(FIRE_STORAGE_KEY)
    }

    marketApi.stats()
      .then(setMarket)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState message="Loading your financial overview…" />

  const allocationData = portfolio
    ? Object.entries(portfolio.asset_allocation?.current_allocation || {}).map(([name, value]) => ({ name, value }))
    : []

  const totalValue = portfolio?.summary?.total_current_value || 0
  const totalGain = portfolio?.summary?.total_gain || 0
  const portfolioXirr = portfolio?.portfolio_xirr?.xirr || 0
  const healthScore = health?.total_score || 0
  const healthStatus = health?.overall_status || '—'
  const fireSurplus = fire?.summary?.investable_surplus || 0
  const fireCorpus = fire?.fire_number?.fire_corpus_inr || 0

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 3px var(--green-light)' }} />
          <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Live · AMFI Data — {market?.total_funds?.toLocaleString()} funds tracked
          </span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>Financial Overview</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          {portfolio ? `${portfolio?.investor_name || 'Investor'} · ${portfolio?.summary?.num_funds || 0} funds analyzed` : 'No portfolio loaded yet. Upload your CAMS PDF in Portfolio X-Ray to see real insights here.'}
        </p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Portfolio Value" value={portfolio ? fmt.inr(totalValue) : '—'} sub={portfolio ? `${fmt.inr(totalGain)} total gain` : 'Upload CAMS to compute'} trend={portfolio ? 1 : 0} color="var(--accent)" delay={0} icon={TrendingUp} />
        <StatCard label="Portfolio XIRR" value={portfolio ? `${portfolioXirr}%` : '—'} sub={portfolio ? 'vs 14.5% Nifty 50 TRI' : 'Available after analysis'} trend={portfolio ? portfolioXirr - 14.5 : 0} color={portfolio ? (portfolioXirr > 14.5 ? 'var(--green)' : 'var(--amber)') : 'var(--muted-2)'} delay={80} icon={Activity} />
        <StatCard label="Money Health Score" value={health ? `${healthScore}/100` : '—'} sub={health ? healthStatus : 'Complete assessment'} trend={health ? (healthScore > 60 ? 1 : -1) : 0} color={health?.overall_color || 'var(--muted-2)'} delay={160} icon={HeartPulse} />
        <StatCard label="FIRE Corpus Needed" value={fire ? fmt.inr(fireCorpus) : '—'} sub={fire ? `Monthly surplus: ${fmt.inr(fireSurplus)}` : 'Create FIRE plan'} trend={0} color={fire ? 'var(--purple)' : 'var(--muted-2)'} delay={240} icon={Target} />
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Allocation chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Asset Allocation</h3>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => onNavigate('portfolio')}>
              Full X-Ray <ArrowRight size={12} />
            </button>
          </div>
          {allocationData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={allocationData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {allocationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {allocationData.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, flex: 1, color: 'var(--ink-3)' }}>{item.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt.inr(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>No data</div>}
        </div>

        {/* Health Score summary */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Money Health Score</h3>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => onNavigate('health')}>
              Details <ArrowRight size={12} />
            </button>
          </div>
          {health && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                  <svg width={80} height={80} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={40} cy={40} r={32} fill="none" stroke="var(--border)" strokeWidth={7} />
                    <circle cx={40} cy={40} r={32} fill="none" stroke={health.overall_color} strokeWidth={7}
                      strokeDasharray={`${(healthScore / 100) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`}
                      strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', color: health.overall_color }}>{healthScore}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: health.overall_color }}>{healthStatus}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>out of 100 points</div>
                </div>
              </div>
              {/* Mini dimension scores */}
              {Object.entries(health.scores || {}).map(([dim, score]) => {
                const maxMap = { emergency: 20, insurance: 20, diversification: 15, debt: 15, tax: 15, retirement: 15 }
                const max = maxMap[dim] || 15
                const pct = (score / max) * 100
                const col = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)'
                return (
                  <div key={dim} style={{ marginBottom: 7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, textTransform: 'capitalize', color: 'var(--muted)' }}>{dim}</span>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{score}/{max}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 99, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <QuickAction
          icon={<ScanLine />} color="var(--accent)" title="Analyze Portfolio"
          desc="Upload your CAMS statement for XIRR, overlap & rebalancing insights"
          cta="Open X-Ray" onClick={() => onNavigate('portfolio')}
        />
        <QuickAction
          icon={<FlameIcon />} color="#f97316" title="Plan Your FIRE"
          desc="Set goals, compute corpus targets and get month-by-month SIP roadmap"
          cta="Start Planning" onClick={() => onNavigate('fire')}
        />
        <QuickAction
          icon={<HeartPulse size={20} />} color="var(--red)" title="Check Money Health"
          desc="5-minute profiling across 6 dimensions with priority action list"
          cta="Get Score" onClick={() => onNavigate('health')}
        />
      </div>

      <Disclaimer text={portfolio?.sebi_disclaimer || 'AI-generated analysis. Not SEBI-registered investment advice.'} />
    </div>
  )
}

function ScanLine() { return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18"/></svg> }
function FlameIcon() { return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg> }

function QuickAction({ icon, color, title, desc, cta, onClick }) {
  return (
    <div className="card animate-fade-up" style={{ cursor: 'pointer', transition: 'all 0.2s', borderTop: `3px solid ${color}` }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
    >
      <div style={{ width: 40, height: 40, background: `${color}18`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: 12 }}>
        {icon}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 16 }}>{desc}</div>
      <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '8px 12px' }}>
        {cta} <ArrowRight size={13} />
      </button>
    </div>
  )
}
