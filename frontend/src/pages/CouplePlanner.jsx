import { HeartHandshake, Scale, Users } from 'lucide-react'
import { useState } from 'react'
import { plannerApi } from '../api/client.js'
import { Disclaimer, InfoRow, LoadingState, SectionHeader, StatCard, Tag } from '../components/UI.jsx'

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>{label}</label>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        style={{ minHeight: 44, fontSize: 15 }}
      />
    </div>
  )
}

export default function CouplePlanner() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const [input, setInput] = useState({
    partner1: {
      name: 'partner1',
      salary_breakdown: { basic: 80000, hra: 30000, allowances: 20000 },
      deductions: { '80C': 120000, '80D': 25000, '80CCD1B': 10000 },
      risk_profile: 'moderate',
      additional_income_streams: [{ source: 'teaching', annual_amount: 60000 }],
      future_income_change: { expected_annual_income_change: 200000 },
      salary_period: 'monthly'
    },
    partner2: {
      name: 'partner2',
      salary_breakdown: { basic: 45000, hra: 15000, allowances: 10000 },
      deductions: { '80C': 50000, '80D': 0, '80CCD1B': 0 },
      risk_profile: 'low',
      additional_income_streams: [],
      salary_period: 'monthly'
    },
    mode: 'tax_optimized'
  })

  async function runPlanner() {
    setError('')
    setLoading(true)
    try {
      setResult(await plannerApi.couplePlanner(input))
    } catch (e) {
      setError(e.message || 'Failed to run Couple Money Planner')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingState message="Building couple strategy plan..." />

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>Couple Money Planner</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          Choose tax-optimized or equal strategy and generate partner-specific allocation guidance.
        </p>
      </div>

      {error && <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: 'var(--red-light)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ffb5b5' }}>{error}</div>}

      <section className="card" style={{ maxWidth: 1060, width: '100%', padding: 28 }}>
        <h3 style={{ marginBottom: 16, fontSize: 24, fontWeight: 700 }}>Partner Inputs</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <Field label="Partner 1 Name" value={input.partner1.name} onChange={(v) => setInput(s => ({ ...s, partner1: { ...s.partner1, name: v } }))} />
          <Field label="Partner 2 Name" value={input.partner2.name} onChange={(v) => setInput(s => ({ ...s, partner2: { ...s.partner2, name: v } }))} />
          <Field label="Partner 1 Basic Salary" type="number" value={input.partner1.salary_breakdown.basic} onChange={(v) => setInput(s => ({ ...s, partner1: { ...s.partner1, salary_breakdown: { ...s.partner1.salary_breakdown, basic: v } } }))} />
          <Field label="Partner 2 Basic Salary" type="number" value={input.partner2.salary_breakdown.basic} onChange={(v) => setInput(s => ({ ...s, partner2: { ...s.partner2, salary_breakdown: { ...s.partner2.salary_breakdown, basic: v } } }))} />
        </div>

        <div style={{ marginTop: 8, marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>Mode</label>
          <select className="input" style={{ minHeight: 44, fontSize: 15 }} value={input.mode} onChange={(e) => setInput(s => ({ ...s, mode: e.target.value }))}>
            <option value="tax_optimized">tax_optimized</option>
            <option value="equal">equal</option>
          </select>
        </div>

        <button className="btn btn-primary" style={{ minHeight: 46, fontSize: 15, padding: '0 20px' }} onClick={runPlanner} disabled={loading}>
          {loading ? 'Running...' : 'Run Couple Planner'}
        </button>
      </section>

      {result && <CoupleResultView result={result} />}
    </div>
  )
}

function CoupleResultView({ result }) {
  const strategy = result.strategy || 'tax_optimized'
  const isEqual = strategy === 'equal'

  return (
    <div style={{ marginTop: 20 }}>
      <SectionHeader title="Couple Strategy Analysis" subtitle="Groq-powered split strategy with tax-awareness" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
        <StatCard label="Mode" value={strategy === 'equal' ? 'EQUAL' : 'TAX OPTIMIZED'} sub={isEqual ? '50:50 allocation style' : 'Tax-aware allocation style'} icon={Scale} color={isEqual ? 'var(--purple)' : 'var(--green)'} />
        <StatCard label="Primary Lens" value={isEqual ? 'Fair Split' : 'Tax Efficiency'} sub={isEqual ? 'No tax bias in split' : 'Higher bracket partner prioritized'} icon={HeartHandshake} color={isEqual ? 'var(--accent)' : 'var(--amber)'} />
        <StatCard label="Plan Type" value={isEqual ? 'Balanced' : 'Optimized'} sub="Actionable allocation guidance" icon={Users} color="var(--accent)" />
      </div>

      {isEqual ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionHeader title="Equal Mode Allocation" subtitle="Expenses and savings are split equally" />
          {Object.entries(result.expense_split || {}).map(([name, split]) => (
            <InfoRow key={`exp-${name}`} label={`Expense Split · ${name}`} value={toDisplayText(split)} />
          ))}
          {Object.entries(result.savings_split || {}).map(([name, split]) => (
            <InfoRow key={`sav-${name}`} label={`Savings Split · ${name}`} value={toDisplayText(split)} />
          ))}
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>{toDisplayText(result.tax_note) || 'Tax note unavailable.'}</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className="card">
              <SectionHeader title="Income Roles" />
              <RoleCard title="Higher Tax Bracket Partner" role={result.income_roles?.higher_tax_bracket_partner} color="green" />
              <RoleCard title="Lower Tax Bracket Partner" role={result.income_roles?.lower_tax_bracket_partner} color="blue" />
            </div>

            <div className="card">
              <SectionHeader title="Core Tax Strategies" />
              <StrategyLine label="NPS Strategy" value={result.nps_strategy} />
              <StrategyLine label="HRA Strategy" value={result.hra_strategy} />
              <div style={{ marginTop: 10 }}>
                <strong style={{ fontSize: 13 }}>SIP Split</strong>
                <div style={{ marginTop: 8 }}>
                  {Object.entries(result.sip_split || {}).map(([name, split]) => (
                    <InfoRow key={name} label={name} value={toDisplayText(split)} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <SectionHeader title="Allocation Plan" subtitle="Who should handle what" />
            {Object.entries(result.allocation_plan || {}).map(([bucket, content]) => (
              <div key={bucket} style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 6 }}><Tag color="purple">{formatLabel(bucket)}</Tag></div>
                {Object.entries(content || {}).map(([name, note]) => (
                  <div key={`${bucket}-${name}`} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{toDisplayText(note)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {!isEqual && (
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionHeader title="Future Income Adjustment" />
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{toDisplayText(result.future_adjustment_notes) || 'No future adjustment note provided.'}</div>
        </div>
      )}

      <Disclaimer text="Couple planner suggestions are planning aids. Validate legal/tax allocations with a qualified advisor." />
    </div>
  )
}

function StrategyLine({ label, value }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10, marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{toDisplayText(value) || 'No strategy note available.'}</div>
    </div>
  )
}

function RoleCard({ title, role, color }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <strong style={{ fontSize: 12 }}>{title}</strong>
        <Tag color={color}>{toDisplayText(role?.tax_bracket) || '—'}</Tag>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink)', marginBottom: 3 }}>{toDisplayText(role?.name) || 'Not provided'}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{toDisplayText(role?.priority) || 'No priority note provided.'}</div>
    </div>
  )
}

function formatLabel(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

function toDisplayText(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value.map((v) => toDisplayText(v)).filter(Boolean).join(', ')
  }
  if (typeof value === 'object') {
    const pairs = Object.entries(value)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${toDisplayText(v)}`)
      .filter((line) => !line.endsWith(': '))
    return pairs.join(' | ')
  }
  return String(value)
}
