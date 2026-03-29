import { useState } from 'react'
import { plannerApi } from '../api/client.js'

function JsonBlock({ data }) {
  if (!data) return null
  return (
    <pre style={{
      marginTop: 14,
      background: 'var(--ink)',
      color: '#e5e7eb',
      borderRadius: 10,
      padding: 14,
      overflowX: 'auto',
      fontSize: 12,
      lineHeight: 1.5,
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{label}</label>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      />
    </div>
  )
}

export default function FinancialPlanner() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [taxInput, setTaxInput] = useState({
    salary_breakdown: { basic: 60000, hra: 25000, allowances: 15000 },
    deductions: { '80C': 100000, '80D': 0, '80CCD1B': 0 },
    risk_profile: 'moderate',
    additional_income_streams: [{ source: 'freelancing', annual_amount: 120000 }],
    future_income_change: { expected_annual_income_change: 250000, career_shift: 'moving to product role' },
    salary_period: 'monthly'
  })

  const [coupleInput, setCoupleInput] = useState({
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

  const [studentInput, setStudentInput] = useState({
    monthly_budget: 1000,
    investment_duration: 4,
    risk_appetite: 'moderate',
    user_type: 'student'
  })

  const [taxResult, setTaxResult] = useState(null)
  const [coupleResult, setCoupleResult] = useState(null)
  const [studentResult, setStudentResult] = useState(null)
  const [unifiedResult, setUnifiedResult] = useState(null)

  async function runTax() {
    setError('')
    setLoading(true)
    try {
      setTaxResult(await plannerApi.taxWizard(taxInput))
    } catch (e) {
      setError(e.message || 'Failed to run Tax Wizard')
    } finally {
      setLoading(false)
    }
  }

  async function runCouple() {
    setError('')
    setLoading(true)
    try {
      setCoupleResult(await plannerApi.couplePlanner(coupleInput))
    } catch (e) {
      setError(e.message || 'Failed to run Couple Planner')
    } finally {
      setLoading(false)
    }
  }

  async function runStudent() {
    setError('')
    setLoading(true)
    try {
      setStudentResult(await plannerApi.studentSipPlanner(studentInput))
    } catch (e) {
      setError(e.message || 'Failed to run Student SIP Planner')
    } finally {
      setLoading(false)
    }
  }

  async function runUnified() {
    setError('')
    setLoading(true)
    try {
      setUnifiedResult(await plannerApi.unifiedPlanner({
        tax_wizard: taxInput,
        couple_planner: coupleInput,
        student_module: studentInput
      }))
    } catch (e) {
      setError(e.message || 'Failed to run unified planner')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>Financial Planner Hub</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          Tax Wizard, Couple Money Planner, Student SIP Planner, and Unified Insights.
        </p>
      </div>

      {error && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 10,
          background: 'var(--red-light)',
          border: '1px solid #fecaca',
          color: '#991b1b'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <section className="card">
          <h3 style={{ marginBottom: 12 }}>Tax Wizard</h3>
          <Field label="Basic Salary" type="number" value={taxInput.salary_breakdown.basic} onChange={(v) => setTaxInput(s => ({ ...s, salary_breakdown: { ...s.salary_breakdown, basic: v } }))} />
          <Field label="HRA" type="number" value={taxInput.salary_breakdown.hra} onChange={(v) => setTaxInput(s => ({ ...s, salary_breakdown: { ...s.salary_breakdown, hra: v } }))} />
          <Field label="Allowances" type="number" value={taxInput.salary_breakdown.allowances} onChange={(v) => setTaxInput(s => ({ ...s, salary_breakdown: { ...s.salary_breakdown, allowances: v } }))} />
          <button className="btn btn-primary" onClick={runTax} disabled={loading}>Run Tax Wizard</button>
          <JsonBlock data={taxResult} />
        </section>

        <section className="card">
          <h3 style={{ marginBottom: 12 }}>Couple Money Planner</h3>
          <Field label="Partner 1 Name" value={coupleInput.partner1.name} onChange={(v) => setCoupleInput(s => ({ ...s, partner1: { ...s.partner1, name: v } }))} />
          <Field label="Partner 2 Name" value={coupleInput.partner2.name} onChange={(v) => setCoupleInput(s => ({ ...s, partner2: { ...s.partner2, name: v } }))} />
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Mode</label>
            <select className="input" value={coupleInput.mode} onChange={(e) => setCoupleInput(s => ({ ...s, mode: e.target.value }))}>
              <option value="tax_optimized">tax_optimized</option>
              <option value="equal">equal</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={runCouple} disabled={loading}>Run Couple Planner</button>
          <JsonBlock data={coupleResult} />
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section className="card">
          <h3 style={{ marginBottom: 12 }}>Student SIP Planner</h3>
          <Field label="Monthly Budget" type="number" value={studentInput.monthly_budget} onChange={(v) => setStudentInput(s => ({ ...s, monthly_budget: v }))} />
          <Field label="Investment Duration (years)" type="number" value={studentInput.investment_duration} onChange={(v) => setStudentInput(s => ({ ...s, investment_duration: v }))} />
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Risk Appetite</label>
            <select className="input" value={studentInput.risk_appetite} onChange={(e) => setStudentInput(s => ({ ...s, risk_appetite: e.target.value }))}>
              <option value="high">high</option>
              <option value="moderate">moderate</option>
              <option value="low">low</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={runStudent} disabled={loading}>Run Student Planner</button>
          <JsonBlock data={studentResult} />
        </section>

        <section className="card">
          <h3 style={{ marginBottom: 12 }}>Unified Financial Intelligence</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
            Runs all 3 modules and returns consolidated JSON output.
          </p>
          <button className="btn btn-primary" onClick={runUnified} disabled={loading}>Run Unified Planner</button>
          <JsonBlock data={unifiedResult} />
        </section>
      </div>
    </div>
  )
}
