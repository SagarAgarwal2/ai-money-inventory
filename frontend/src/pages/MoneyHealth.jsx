import { ChevronRight, HeartPulse, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { fmt, healthApi } from '../api/client.js'
import { Disclaimer, LoadingState, ScoreRing, SectionHeader, Tag } from '../components/UI.jsx'

const STEPS = [
  { id: 'basics', label: 'Basics', icon: '👤' },
  { id: 'emergency', label: 'Emergency', icon: '🛡️' },
  { id: 'insurance', label: 'Insurance', icon: '🏥' },
  { id: 'investments', label: 'Investments', icon: '📈' },
  { id: 'debt', label: 'Debt & Tax', icon: '📊' },
  { id: 'retirement', label: 'Retirement', icon: '🏖️' },
]

const DIM_ICONS = { emergency: '🛡️', insurance: '🏥', diversification: '📈', debt: '💳', tax: '📊', retirement: '🏖️' }
const DIM_LABELS = { emergency: 'Emergency Preparedness', insurance: 'Insurance Coverage', diversification: 'Investment Diversification', debt: 'Debt Health', tax: 'Tax Efficiency', retirement: 'Retirement Readiness' }
const DIM_MAX = { emergency: 20, insurance: 20, diversification: 15, debt: 15, tax: 15, retirement: 15 }
const HEALTH_STORAGE_KEY = 'amm_health_score'

export default function MoneyHealth() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    monthly_income: 100000, monthly_expenses: 60000,
    liquid_savings: 150000,
    term_cover: 10000000, health_cover: 500000,
    asset_classes: [], all_in_fd: false,
    emi_to_income_ratio: 0.2, has_high_interest_debt: false,
    sec_80c_used: 100000, sec_80d_used: 25000, sec_80ccd_used: 0,
    current_corpus: 1200000, required_corpus_at_60: 30000000, years_to_retirement: 27,
  })

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function submit() {
    setLoading(true)
    try {
      const scored = await healthApi.score(form)
      setResult(scored)
      localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(scored))
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  if (loading) return <LoadingState message="Computing your Money Health Score…" />
  if (result) return <ScoreView result={result} onReset={() => setResult(null)} />

  const isLastStep = step === STEPS.length - 1

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>Money Health Score</h1>
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>5-minute financial wellness assessment across 6 dimensions</p>
        </div>
      </div>

      {/* Step progress */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 32, background: 'var(--surface)', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        {STEPS.map((s, i) => (
          <button key={s.id} onClick={() => setStep(i)}
            style={{ flex: 1, padding: '8px 4px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: i < step ? 'var(--green)' : i === step ? 'var(--accent)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i < step ? 14 : 13, transition: 'all 0.2s' }}>
              {i < step ? '✓' : s.icon}
            </div>
            <span style={{ fontSize: 10, fontWeight: i === step ? 700 : 400, color: i === step ? 'var(--accent)' : 'var(--muted)' }}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="card animate-scale-in" style={{ maxWidth: 640, margin: '0 auto' }}>
        {step === 0 && (
          <StepSection title="👤 Basic Financial Info" desc="Your income and expense profile">
            <FieldRow label="Monthly Take-home Income" value={form.monthly_income} onChange={v => set('monthly_income', +v)} prefix="₹" />
            <FieldRow label="Monthly Fixed Expenses" value={form.monthly_expenses} onChange={v => set('monthly_expenses', +v)} prefix="₹" />
          </StepSection>
        )}
        {step === 1 && (
          <StepSection title="🛡️ Emergency Fund" desc="Liquid savings readily accessible">
            <FieldRow label="Total Liquid Savings (savings a/c + liquid fund)" value={form.liquid_savings} onChange={v => set('liquid_savings', +v)} prefix="₹" />
            <div style={{ padding: '12px', background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
              💡 Target: 6× your monthly expenses = <strong style={{ color: 'var(--ink)' }}>{fmt.inr(form.monthly_expenses * 6)}</strong>
            </div>
          </StepSection>
        )}
        {step === 2 && (
          <StepSection title="🏥 Insurance Coverage" desc="Term life and health insurance">
            <FieldRow label="Term Life Cover" value={form.term_cover} onChange={v => set('term_cover', +v)} prefix="₹" />
            <FieldRow label="Health Insurance (family floater)" value={form.health_cover} onChange={v => set('health_cover', +v)} prefix="₹" />
            <div style={{ padding: '12px', background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
              💡 Recommended term cover: <strong style={{ color: 'var(--ink)' }}>{fmt.inr(form.monthly_income * 12 * 15)}</strong> (15× annual income)
            </div>
          </StepSection>
        )}
        {step === 3 && (
          <StepSection title="📈 Investment Diversification" desc="Where is your money invested?">
            <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'block' }}>Select all asset classes you currently hold:</label>
            {[['equity_mf', '🏦 Equity Mutual Funds'], ['debt_mf', '💰 Debt Mutual Funds'], ['ppf', '🏛️ PPF / EPF'], ['fd', '📄 Fixed Deposits'], ['stocks', '📊 Direct Stocks'], ['gold', '🥇 Gold / SGBs'], ['real_estate', '🏠 Real Estate']].map(([val, label]) => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', marginBottom: 6, border: `1.5px solid ${form.asset_classes.includes(val) ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'border-color 0.15s', background: form.asset_classes.includes(val) ? 'var(--accent-light)' : 'white' }}>
                <input type="checkbox" checked={form.asset_classes.includes(val)} style={{ accentColor: 'var(--accent)' }}
                  onChange={e => set('asset_classes', e.target.checked ? [...form.asset_classes, val] : form.asset_classes.filter(a => a !== val))} />
                <span style={{ fontSize: 13, fontWeight: form.asset_classes.includes(val) ? 600 : 400 }}>{label}</span>
              </label>
            ))}
          </StepSection>
        )}
        {step === 4 && (
          <StepSection title="📊 Debt & Tax Situation" desc="Your liabilities and tax optimization">
            <FieldRow label="EMI payments as % of income" value={(form.emi_to_income_ratio * 100).toFixed(0)} onChange={v => set('emi_to_income_ratio', +v / 100)} suffix="%" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.has_high_interest_debt} style={{ accentColor: 'var(--accent)' }}
                onChange={e => set('has_high_interest_debt', e.target.checked)} />
              <span style={{ fontSize: 13 }}>I have high-interest debt (credit card, personal loan &gt;12% p.a.)</span>
            </label>
            <div style={{ marginTop: 4, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>Tax Deductions Used This Year</label>
              <FieldRow label="Section 80C (ELSS, PPF, LIC…)" value={form.sec_80c_used} onChange={v => set('sec_80c_used', +v)} prefix="₹" sub="Max ₹1.5L" />
              <FieldRow label="Section 80D (Health Insurance)" value={form.sec_80d_used} onChange={v => set('sec_80d_used', +v)} prefix="₹" sub="Max ₹25K" />
              <FieldRow label="NPS 80CCD(1B)" value={form.sec_80ccd_used} onChange={v => set('sec_80ccd_used', +v)} prefix="₹" sub="Max ₹50K" />
            </div>
          </StepSection>
        )}
        {step === 5 && (
          <StepSection title="🏖️ Retirement Readiness" desc="Current corpus vs what you'll need">
            <FieldRow label="Current retirement corpus (MF + PF + PPF + FDs)" value={form.current_corpus} onChange={v => set('current_corpus', +v)} prefix="₹" />
            <FieldRow label="Target corpus needed at age 60" value={form.required_corpus_at_60} onChange={v => set('required_corpus_at_60', +v)} prefix="₹" />
            <FieldRow label="Years to retirement" value={form.years_to_retirement} onChange={v => set('years_to_retirement', +v)} suffix="yrs" />
          </StepSection>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={() => setStep(s => Math.max(0, s - 1))} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
            ← Back
          </button>
          {isLastStep ? (
            <button className="btn btn-primary" style={{ padding: '12px 28px' }} onClick={submit}>
              <HeartPulse size={16} /> Get My Score
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StepSection({ title, desc, children }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>{desc}</p>
      </div>
      {children}
    </div>
  )
}

function FieldRow({ label, value, onChange, prefix, suffix, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span>{label}</span>
        {sub && <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--accent)' }}>{sub}</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {prefix && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', pointerEvents: 'none' }}>{prefix}</span>}
        <input className="input" type="number" value={value} onChange={e => onChange(e.target.value)}
          style={{ paddingLeft: prefix ? 24 : 14, paddingRight: suffix ? 36 : 14 }} />
        {suffix && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', pointerEvents: 'none' }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ── Score Result View ────────────────────────────────────────────────────
function ScoreView({ result, onReset }) {
  const score = result.total_score
  const status = result.overall_status
  const color = result.overall_color
  const scores = result.scores || {}
  const details = result.details || {}
  const actions = result.priority_actions || []

  const statusIcon = score >= 81 ? '🏆' : score >= 61 ? '✅' : score >= 41 ? '⚠️' : '🚨'

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Your Money Health Score</h1>
        <button className="btn btn-outline" onClick={onReset}><RefreshCw size={14} /> Retake</button>
      </div>

      {/* Hero score */}
      <div className="card" style={{ marginBottom: 20, background: `linear-gradient(135deg, ${color}10, white)`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', gap: 32, padding: '32px' }}>
        <ScoreRing score={score} max={100} size={140} color={color} label={status} />
        <div>
          <div style={{ fontSize: 40 }}>{statusIcon}</div>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', color, marginBottom: 4 }}>{status}</div>
          <div style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 360 }}>
            {score >= 81 ? 'Excellent financial health! You\'re well-prepared across all dimensions.' :
             score >= 61 ? 'You\'re on track — a few targeted improvements can push you to excellent.' :
             score >= 41 ? 'Several areas need attention. Follow the priority actions below.' :
             'Critical gaps detected. Start with the highest-priority action immediately.'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Dimension breakdown */}
        <div className="card">
          <SectionHeader title="Dimension Scores" />
          {Object.entries(scores).map(([dim, score]) => {
            const max = DIM_MAX[dim] || 15
            const d = details[dim] || {}
            const pct = (score / max) * 100
            const col = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)'
            return (
              <div key={dim} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                  <div style={{ display: 'flex', align: 'center', gap: 6 }}>
                    <span>{DIM_ICONS[dim]}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{DIM_LABELS[dim]}</span>
                  </div>
                  <div style={{ display: 'flex', align: 'center', gap: 8 }}>
                    <Tag color={pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red'}>{d.status}</Tag>
                    <span style={{ fontSize: 13, fontWeight: 700, color: col }}>{score}/{max}</span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 99, transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{d.action}</div>
              </div>
            )
          })}
        </div>

        {/* Priority Actions */}
        <div className="card">
          <SectionHeader title="🎯 Priority Action List" subtitle="Ranked by impact × ease — start from the top" />
          {actions.map((a, i) => (
            <div key={i} style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{a.title}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Tag color="green">{a.score_impact}</Tag>
                    <Tag color={a.difficulty === 'Easy' ? 'blue' : a.difficulty === 'Hard' ? 'red' : 'amber'}>{a.difficulty}</Tag>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{a.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed dimension cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {Object.entries(details).map(([dim, d]) => (
          <DimCard key={dim} dim={dim} detail={d} />
        ))}
      </div>

      <Disclaimer text={result.sebi_disclaimer} />
    </div>
  )
}

function DimCard({ dim, detail: d }) {
  const colorMap = { green: 'var(--green)', yellow: 'var(--amber)', orange: 'var(--amber)', red: 'var(--red)' }
  const bgMap = { green: 'var(--green-light)', yellow: 'var(--amber-light)', orange: 'var(--amber-light)', red: 'var(--red-light)' }
  const col = colorMap[d.color] || 'var(--muted)'
  const bg = bgMap[d.color] || 'var(--surface-3)'

  return (
    <div className="card" style={{ borderTop: `3px solid ${col}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{DIM_ICONS[dim]} {DIM_LABELS[dim]}</span>
        <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', color: col }}>{d.score}</span>
      </div>
      <div style={{ display: 'inline-block', padding: '3px 10px', background: bg, color: col, borderRadius: 100, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
        {d.status}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{d.action}</div>
    </div>
  )
}
