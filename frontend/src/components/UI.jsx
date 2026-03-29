import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

// ── Stat Card ────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, trend, color, delay = 0, icon: Icon }) {
  const trendColor = trend > 0 ? 'var(--green)' : trend < 0 ? 'var(--red)' : 'var(--muted)'
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  return (
    <div className="card animate-fade-up" style={{ animationDelay: `${delay}ms`, borderTop: color ? `3px solid ${color}` : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        {Icon && <Icon size={16} color="var(--muted-2)" />}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', color: color || 'var(--ink)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {trend !== undefined && <TrendIcon size={13} color={trendColor} />}
        <span style={{ color: trend !== undefined ? trendColor : 'var(--muted)' }}>{sub}</span>
      </div>}
    </div>
  )
}

// ── Score Ring ───────────────────────────────────────────────────────────
export function ScoreRing({ score, max = 100, size = 120, label, color = 'var(--accent)', animate = true }) {
  const pct = Math.min(1, score / max)
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const dash = pct * circ

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={8} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={8}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: animate ? 'stroke-dasharray 1s ease' : 'none' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size > 100 ? 28 : 20, fontWeight: 800, fontFamily: 'var(--font-display)', color }}>{score}</span>
          {max !== 100 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>/{max}</span>}
        </div>
      </div>
      {label && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>{label}</span>}
    </div>
  )
}

// ── Mini Score Bar ───────────────────────────────────────────────────────
export function ScoreBar({ label, score, max, color }) {
  const pct = Math.min(100, (score / max) * 100)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{score}<span style={{ color: 'var(--muted)', fontWeight: 400 }}>/{max}</span></span>
      </div>
      <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

// ── Loading Spinner ──────────────────────────────────────────────────────
export function Spinner({ size = 24, color = 'var(--accent)' }) {
  return (
    <div style={{ width: size, height: size, border: `2px solid var(--border)`, borderTop: `2px solid ${color}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  )
}

// ── Loading State ────────────────────────────────────────────────────────
export function LoadingState({ message = 'Analyzing your portfolio...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 20 }}>
      <div style={{ position: 'relative' }}>
        <Spinner size={48} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--accent)', animation: 'pulse-ring 1.5s ease infinite', opacity: 0.3 }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{message}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Fetching live NAV data from AMFI…</div>
      </div>
    </div>
  )
}

// ── Section Header ───────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Disclaimer Banner ────────────────────────────────────────────────────
export function Disclaimer({ text }) {
  return (
    <div style={{ background: 'var(--amber-light)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 12, color: '#fcd28a', marginTop: 16, lineHeight: 1.5 }}>
      ⚠️ {text}
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
      {Icon && <div style={{ width: 56, height: 56, background: 'var(--surface-3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={24} color="var(--muted)" />
      </div>}
      <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 320 }}>{description}</div>}
      {action}
    </div>
  )
}

// ── Tag / Chip ───────────────────────────────────────────────────────────
export function Tag({ children, color = 'blue' }) {
  const colors = {
    blue: { bg: 'var(--accent-light)', text: 'var(--accent-2)' },
    green: { bg: 'var(--green-light)', text: '#9bf0d4' },
    red: { bg: 'var(--red-light)', text: '#ffb5b5' },
    amber: { bg: 'var(--amber-light)', text: '#fcd28a' },
    purple: { bg: 'var(--purple-light)', text: '#d8c1ff' },
  }
  const c = colors[color] || colors.blue
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, letterSpacing: '0.03em' }}>
      {children}
    </span>
  )
}

// ── Priority Badge ───────────────────────────────────────────────────────
export function PriorityBadge({ priority }) {
  const map = { high: ['red', '🔴'], medium: ['amber', '🟡'], low: ['green', '🟢'] }
  const [color, emoji] = map[priority] || map.medium
  return <Tag color={color}>{emoji} {priority}</Tag>
}

// ── Info Row ─────────────────────────────────────────────────────────────
export function InfoRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-2)', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: valueColor || 'var(--ink)' }}>{value}</span>
    </div>
  )
}
