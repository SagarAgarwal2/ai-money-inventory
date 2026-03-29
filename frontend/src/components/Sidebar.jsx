import { ChevronRight, Flame, GraduationCap, HeartPulse, Landmark, LayoutDashboard, Newspaper, ScanLine, TrendingUp, Users } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'portfolio', label: 'Portfolio X-Ray', icon: ScanLine, badge: 'Core' },
  { id: 'fire', label: 'FIRE Planner', icon: Flame },
  { id: 'health', label: 'Money Health', icon: HeartPulse },
  { id: 'taxWizard', label: 'Tax Wizard', icon: Landmark, badge: 'New' },
  { id: 'couplePlanner', label: 'Couple Planner', icon: Users },
  { id: 'studentSip', label: 'Student SIP', icon: GraduationCap },
  { id: 'blog', label: 'Market Blog', icon: Newspaper },
]

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="sidebar-brand-icon">
            <TrendingUp size={18} color="#f5f7ff" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1.05 }}>AI Money</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--accent)', lineHeight: 1.05 }}>Mentor</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '14px 10px' }}>
        {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onNavigate(id)} className={`sidebar-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} color={isActive ? 'var(--text-primary)' : 'var(--text-muted)'} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'left' }}>
                {label}
              </span>
              {badge && <span className="sidebar-badge">{badge}</span>}
              {isActive && <ChevronRight size={12} color="var(--text-muted)" />}
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Live NAV · AMFI India<br />
          <span style={{ color: 'var(--text-subtle)' }}>Not SEBI-registered advice</span>
        </div>
      </div>
    </aside>
  )
}
