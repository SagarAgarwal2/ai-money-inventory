import { ChevronRight, Flame, HeartPulse, LayoutDashboard, ScanLine, TrendingUp } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'portfolio', label: 'Portfolio X-Ray', icon: ScanLine, badge: 'Core' },
  { id: 'fire', label: 'FIRE Planner', icon: Flame },
  { id: 'health', label: 'Money Health', icon: HeartPulse },
]

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: 'var(--ink)',
      display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={18} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'white', lineHeight: 1.1 }}>AI Money</div>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent)', lineHeight: 1.1 }}>Mentor</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          ET AI Hackathon 2026 · PS 9
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onNavigate(id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer', marginBottom: 2,
                background: isActive ? 'rgba(26,86,219,0.25)' : 'transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={16} color={isActive ? '#93c5fd' : 'rgba(255,255,255,0.45)'} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? 'white' : 'rgba(255,255,255,0.55)', textAlign: 'left' }}>
                {label}
              </span>
              {badge && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'rgba(26,86,219,0.25)', padding: '2px 6px', borderRadius: 100, letterSpacing: '0.04em' }}>{badge}</span>}
              {isActive && <ChevronRight size={12} color="rgba(255,255,255,0.3)" />}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
          Live NAV · AMFI India<br />
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>Not SEBI-registered advice</span>
        </div>
      </div>
    </aside>
  )
}
