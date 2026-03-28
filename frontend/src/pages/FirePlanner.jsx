import { ChevronDown, ChevronUp, Plus, RefreshCw, Target, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { fireApi, fmt } from '../api/client.js'
import { Disclaimer, InfoRow, LoadingState, SectionHeader, StatCard, Tag } from '../components/UI.jsx'

const RISK_OPTIONS = ['conservative', 'moderate', 'aggressive']
const GOAL_TYPES = ['general', 'education', 'real_estate', 'medical', 'travel', 'wedding']
const FIRE_STORAGE_KEY = 'amm_fire_plan'

export default function FirePlanner() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    age: 32, monthly_income: 150000, monthly_expenses: 70000,
    existing_corpus: 800000, existing_loans_emi: 20000,
    risk_profile: 'moderate', retirement_age: 55,
  })
  const [goals, setGoals] = useState([
    { name: 'Child Education', type: 'education', current_cost_inr: 2500000, years_to_goal: 15, existing_allocation_inr: 0 },
  ])

  async function handleSubmit() {
    setLoading(true)
    try {
      const planned = await fireApi.plan({ ...form, goals })
      setResult(planned)
      localStorage.setItem(FIRE_STORAGE_KEY, JSON.stringify(planned))
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  if (loading) return <LoadingState message="Building your FIRE roadmap…" />
  if (result) return <ResultView result={result} onReset={() => setResult(null)} />

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>FIRE Path Planner</h1>
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>Financial Independence, Retire Early — your personalized month-by-month roadmap</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Personal & Income */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>📊 Personal & Income</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="Current Age" type="number" value={form.age} onChange={v => setForm(f => ({ ...f, age: +v }))} unit="yrs" />
            <FormField label="Target Retirement Age" type="number" value={form.retirement_age} onChange={v => setForm(f => ({ ...f, retirement_age: +v }))} unit="yrs" />
            <FormField label="Monthly Take-home" type="number" value={form.monthly_income} onChange={v => setForm(f => ({ ...f, monthly_income: +v }))} unit="₹" />
            <FormField label="Monthly Expenses" type="number" value={form.monthly_expenses} onChange={v => setForm(f => ({ ...f, monthly_expenses: +v }))} unit="₹" />
            <FormField label="EMI / Loan Payments" type="number" value={form.existing_loans_emi} onChange={v => setForm(f => ({ ...f, existing_loans_emi: +v }))} unit="₹/mo" />
            <FormField label="Existing Corpus" type="number" value={form.existing_corpus} onChange={v => setForm(f => ({ ...f, existing_corpus: +v }))} unit="₹" />
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Profile</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {RISK_OPTIONS.map(r => (
                <button key={r} onClick={() => setForm(f => ({ ...f, risk_profile: r }))}
                  className={form.risk_profile === r ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ flex: 1, justifyContent: 'center', fontSize: 13, textTransform: 'capitalize' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>🎯 Financial Goals</h3>
            <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={() => setGoals(g => [...g, { name: '', type: 'general', current_cost_inr: 1000000, years_to_goal: 10, existing_allocation_inr: 0 }])}>
              <Plus size={13} /> Add Goal
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {goals.map((g, i) => (
              <div key={i} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                  <input className="input" placeholder="Goal name" value={g.name} style={{ flex: 1 }}
                    onChange={e => setGoals(gs => gs.map((g2, j) => j === i ? { ...g2, name: e.target.value } : g2))} />
                  <select className="input" style={{ width: 'auto', padding: '10px 10px' }} value={g.type}
                    onChange={e => setGoals(gs => gs.map((g2, j) => j === i ? { ...g2, type: e.target.value } : g2))}>
                    {GOAL_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                  <button className="btn btn-ghost" style={{ padding: '8px', color: 'var(--red)' }} onClick={() => setGoals(gs => gs.filter((_, j) => j !== i))}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <FormField label="Current Cost" type="number" value={g.current_cost_inr} unit="₹"
                    onChange={v => setGoals(gs => gs.map((g2, j) => j === i ? { ...g2, current_cost_inr: +v } : g2))} />
                  <FormField label="Years to Goal" type="number" value={g.years_to_goal} unit="yrs"
                    onChange={v => setGoals(gs => gs.map((g2, j) => j === i ? { ...g2, years_to_goal: +v } : g2))} />
                  <FormField label="Existing ₹" type="number" value={g.existing_allocation_inr} unit="₹"
                    onChange={v => setGoals(gs => gs.map((g2, j) => j === i ? { ...g2, existing_allocation_inr: +v } : g2))} />
                </div>
              </div>
            ))}
            {goals.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: 13 }}>
                No goals added — plan is retirement-only
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-primary" style={{ padding: '14px 40px', fontSize: 16, borderRadius: 'var(--radius)' }} onClick={handleSubmit}>
          <Target size={18} /> Generate FIRE Roadmap
        </button>
      </div>
    </div>
  )
}

function FormField({ label, type, value, onChange, unit }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label} {unit && <span style={{ fontWeight: 400, textTransform: 'none' }}>({unit})</span>}
      </label>
      <input className="input" type={type || 'text'} value={value}
        onChange={e => onChange(e.target.value)}
        style={{ padding: '9px 12px', fontSize: 14 }} />
    </div>
  )
}

const PIE_COLORS = ['#1a56db', '#0d9f6e', '#d97706', '#7c3aed', '#e02424', '#0891b2']

function ResultView({ result, onReset }) {
  const [expandedPhase, setExpandedPhase] = useState(0)
  const summary = result.summary || {}
  const fire = result.fire_number || {}
  const phases = result.phases || []
  const goals = result.goal_results || []
  const alloc = result.sip_allocation || []
  const tax = result.tax_savings || {}

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Your FIRE Roadmap</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Retire at {fire.retirement_age || '—'} · {fire.years_to_retirement} years to go</p>
        </div>
        <button className="btn btn-outline" onClick={onReset}><RefreshCw size={14} /> New Plan</button>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="FIRE Corpus Needed" value={fmt.inr(fire.fire_corpus_inr)} sub={`Monthly expenses at retirement: ${fmt.inr(fire.monthly_expenses_at_retirement)}`} color="var(--purple)" trend={0} />
        <StatCard label="Required Monthly SIP" value={fmt.inr(summary.recommended_total_sip)} sub={`${summary.surplus_utilization_pct}% of ₹${fmt.inr(summary.investable_surplus)} surplus`} color="var(--accent)" trend={0} />
        <StatCard label="Investable Surplus" value={fmt.inr(summary.investable_surplus)} sub={`Income ${fmt.inr(summary.monthly_income)} − Exp ${fmt.inr(summary.monthly_expenses)}`} color="var(--green)" trend={1} />
        <StatCard label="Tax Savings Available" value={fmt.inr((tax.total_deduction || 0) * 0.3)} sub={`₹${fmt.inr(tax.total_deduction)} deductions at 30% slab`} color="var(--amber)" trend={1} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* SIP Allocation */}
        <div className="card">
          <SectionHeader title="Recommended SIP Allocation" subtitle="Across fund categories based on risk profile & timeline" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie data={alloc} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="monthly_sip_inr" paddingAngle={2}>
                  {alloc.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {alloc.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, flex: 1 }}>{a.fund_type}</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt.inr(a.monthly_sip_inr)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Goal Corpus Summary */}
        <div className="card">
          <SectionHeader title="Goal Corpus Targets" />
          {goals.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>No specific goals added</div>
          ) : goals.map((g, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{g.goal_name}</span>
                <Tag color={g.success_probability_pct >= 80 ? 'green' : g.success_probability_pct >= 60 ? 'amber' : 'red'}>
                  {g.success_probability_pct.toFixed(0)}% success
                </Tag>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                <InfoRow label="Future Cost" value={fmt.inr(g.future_cost_inr)} />
                <InfoRow label="Required SIP" value={fmt.inr(g.required_monthly_sip_inr)} valueColor="var(--accent)" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase Roadmap */}
      <div className="card">
        <SectionHeader title="Month-by-Month Roadmap" subtitle="Phased action plan from day 1 to goal achievement" />
        {phases.map((phase, i) => (
          <div key={i} style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <div
              onClick={() => setExpandedPhase(expandedPhase === i ? -1 : i)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: expandedPhase === i ? 'var(--accent-light)' : 'var(--surface)', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, background: expandedPhase === i ? 'var(--accent)' : 'var(--surface-3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: expandedPhase === i ? 'white' : 'var(--muted)', fontSize: 13, fontWeight: 700 }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{phase.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{phase.subtitle}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Tag color="blue">₹{fmt.inr(phase.monthly_commitment)}/mo</Tag>
                {expandedPhase === i ? <ChevronUp size={16} color="var(--muted)" /> : <ChevronDown size={16} color="var(--muted)" />}
              </div>
            </div>
            {expandedPhase === i && (
              <div style={{ padding: '14px 16px', background: 'var(--surface-2)' }}>
                {phase.actions.map((action, j) => (
                  <div key={j} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 20, height: 20, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{j + 1}</div>
                    <span style={{ fontSize: 13, lineHeight: 1.5 }}>{action}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Disclaimer text={result.sebi_disclaimer} />
    </div>
  )
}
