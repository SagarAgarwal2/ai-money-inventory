import { Calculator, IndianRupee, Landmark, PiggyBank } from 'lucide-react'
import { useState } from 'react'
import { fmt, plannerApi } from '../api/client.js'
import { Disclaimer, InfoRow, LoadingState, SectionHeader, StatCard, Tag } from '../components/UI.jsx'

const TOP_ELSS_FUNDS = [
  { name: 'SBI ELSS Tax Saver Direct Plan', nav: 434.37, oneYear: -1.77, threeYear: 21.23 },
  { name: 'WhiteOak Capital ELSS Tax Saver Direct Plan', nav: 16.43, oneYear: -1.43, threeYear: 20.06 },
  { name: 'DSP ELSS Tax Saver Growth Direct Plan', nav: 143.06, oneYear: -1.55, threeYear: 18.73 },
]

const TAX_SAVING_OPTIONS = [
  { investment: 'Tax Saving Funds (ELSS)', lockIn: '3 Years', returns: '17% - 24%', taxBenefit: '80C up to Rs 1.5L' },
  { investment: 'Life Insurance', lockIn: '5 Years', returns: '0% - 6%', taxBenefit: '80C eligible premium' },
  { investment: 'PPF', lockIn: '15 Years', returns: '7% - 8.5%', taxBenefit: 'EEE + 80C' },
  { investment: 'NSC', lockIn: '5 Years', returns: '7% - 8.5%', taxBenefit: '80C' },
  { investment: 'Tax Saver FD', lockIn: '5 Years', returns: '6% - 9%', taxBenefit: '80C' },
]

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

export default function TaxWizard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const [input, setInput] = useState({
    salary_breakdown: { basic: 60000, hra: 25000, allowances: 15000 },
    deductions: { '80C': 100000, '80D': 0, '80CCD1B': 0 },
    risk_profile: 'moderate',
    additional_income_streams: [{ source: 'freelancing', annual_amount: 120000 }],
    future_income_change: { expected_annual_income_change: 250000, career_shift: 'moving to product role' },
    salary_period: 'monthly'
  })

  async function runAnalysis() {
    setError('')
    setLoading(true)
    try {
      setResult(await plannerApi.taxWizard(input))
    } catch (e) {
      setError(e.message || 'Failed to run Tax Wizard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingState message="Running Tax Wizard analysis..." />

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>Tax Wizard</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          Individual tax analysis with regime comparison, missed deductions, bracket detection, and personalized recommendations.
        </p>
      </div>

      {error && <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: 'var(--red-light)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ffb5b5' }}>{error}</div>}

      <section className="card" style={{ maxWidth: 880 }}>
        <h3 style={{ marginBottom: 12 }}>Income and Deductions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <Field label="Basic Salary" type="number" value={input.salary_breakdown.basic} onChange={(v) => setInput(s => ({ ...s, salary_breakdown: { ...s.salary_breakdown, basic: v } }))} />
          <Field label="HRA" type="number" value={input.salary_breakdown.hra} onChange={(v) => setInput(s => ({ ...s, salary_breakdown: { ...s.salary_breakdown, hra: v } }))} />
          <Field label="Allowances" type="number" value={input.salary_breakdown.allowances} onChange={(v) => setInput(s => ({ ...s, salary_breakdown: { ...s.salary_breakdown, allowances: v } }))} />
          <Field label="80C Used" type="number" value={input.deductions['80C']} onChange={(v) => setInput(s => ({ ...s, deductions: { ...s.deductions, '80C': v } }))} />
          <Field label="80D Used" type="number" value={input.deductions['80D']} onChange={(v) => setInput(s => ({ ...s, deductions: { ...s.deductions, '80D': v } }))} />
          <Field label="80CCD1B Used" type="number" value={input.deductions['80CCD1B']} onChange={(v) => setInput(s => ({ ...s, deductions: { ...s.deductions, '80CCD1B': v } }))} />
        </div>

        <div style={{ marginTop: 12 }}>
          <Field label="Side Income (annual)" type="number" value={input.additional_income_streams[0].annual_amount} onChange={(v) => setInput(s => ({ ...s, additional_income_streams: [{ ...s.additional_income_streams[0], annual_amount: v }] }))} />
          <Field label="Expected Annual Income Change" type="number" value={input.future_income_change.expected_annual_income_change} onChange={(v) => setInput(s => ({ ...s, future_income_change: { ...s.future_income_change, expected_annual_income_change: v } }))} />
        </div>

        <button className="btn btn-primary" onClick={runAnalysis} disabled={loading}>
          {loading ? 'Running...' : 'Run Tax Wizard'}
        </button>
      </section>

      {result && <TaxResultView result={result} />}

      {!result && <TaxSavingInsights />}
    </div>
  )
}

function TaxResultView({ result }) {
  const tax = result.tax_analysis || {}
  const oldTax = Number(tax.tax_old_regime || 0)
  const newTax = Number(tax.tax_new_regime || 0)
  const oldIsBetter = String(tax.recommended_regime || '').toLowerCase() === 'old'
  const savings = Number(tax.estimated_tax_saved || Math.abs(oldTax - newTax))

  return (
    <div style={{ marginTop: 20 }}>
      <SectionHeader title="Tax Analysis Summary" subtitle="Groq-powered tax analysis with personalized recommendations" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
        <StatCard label="Total Income" value={fmt.inr(Number(tax.total_income || 0))} sub="Salary + side income" icon={IndianRupee} color="var(--accent)" />
        <StatCard label="Recommended Regime" value={String(tax.recommended_regime || '—').toUpperCase()} sub={oldIsBetter ? 'Old regime reduces tax' : 'New regime reduces tax'} icon={Landmark} color={oldIsBetter ? 'var(--green)' : 'var(--purple)'} />
        <StatCard label="Tax Bracket" value={result.tax_bracket || '—'} sub="Detected from taxable income" icon={Calculator} color="var(--amber)" />
        <StatCard label="Estimated Saving" value={fmt.inr(savings)} sub="Difference between regimes" icon={PiggyBank} color="var(--green)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <SectionHeader title="Regime Comparison" />
          <InfoRow label="Taxable Income (Old)" value={fmt.inr(Number(tax.taxable_income_old_regime || 0))} />
          <InfoRow label="Taxable Income (New)" value={fmt.inr(Number(tax.taxable_income_new_regime || 0))} />
          <InfoRow label="Tax (Old Regime)" value={fmt.inr(oldTax)} valueColor={oldIsBetter ? 'var(--green)' : 'var(--ink)'} />
          <InfoRow label="Tax (New Regime)" value={fmt.inr(newTax)} valueColor={!oldIsBetter ? 'var(--green)' : 'var(--ink)'} />
          <div style={{ marginTop: 12 }}>
            <Tag color={oldIsBetter ? 'green' : 'purple'}>
              Recommended: {(tax.recommended_regime || 'old').toUpperCase()} regime
            </Tag>
          </div>
        </div>

        <div className="card">
          <SectionHeader title="Income Profile" />
          <InfoRow label="Multiple Income Streams" value={result.income_profile?.multiple_income_streams ? 'Yes' : 'No'} />
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            {toDisplayText(result.income_profile?.future_income_impact) || 'No future income note available.'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <SectionHeader title="Missed Deductions" subtitle="Potential opportunities to reduce tax" />
          {(result.missed_deductions || []).length === 0 ? (
            <div style={{ color: 'var(--green)', fontSize: 13 }}>Great work. No missed deduction opportunities were detected.</div>
          ) : (
            (result.missed_deductions || []).map((d, idx) => (
              <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: 13 }}>{toDisplayText(d.section)}</strong>
                  <Tag color="amber">Unused: {fmt.inr(Number(d.unused_limit || 0))}</Tag>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{toDisplayText(d.note)}</div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <SectionHeader title="Recommendations" subtitle="Priority actions from Tax Wizard" />
          {(result.recommendations || []).map((r, idx) => (
            <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>{toDisplayText(r.instrument)}</strong>
                {r.risk_fit && <Tag color="blue">Risk: {toDisplayText(r.risk_fit)}</Tag>}
                {r.liquidity && <Tag color="purple">Liquidity: {toDisplayText(r.liquidity)}</Tag>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{toDisplayText(r.why)}</div>
            </div>
          ))}
        </div>
      </div>

      <Disclaimer text="Tax estimates are simplified and for planning support. Please verify final filings with a qualified tax professional." />
    </div>
  )
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

function TaxSavingInsights() {
  return (
    <div style={{ marginTop: 20 }}>
      <SectionHeader title="Tax Saving Insights" subtitle="Simple, practical details users can use while planning under Section 80C" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Save Taxes.</h3>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 16 }}>
            Tax Saving ELSS Mutual Funds are eligible for Section 80C deduction (up to Rs 1.5 lakh). Compared with other 80C options,
            ELSS has the shortest lock-in period of 3 years and can suit long-term wealth creation for moderate to high risk investors.
          </p>
          <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', color: 'var(--accent-2)', fontSize: 12, lineHeight: 1.6 }}>
            Tip: Use Tax Wizard output with these instruments. If 80C is not fully used, prioritize high-quality ELSS and keep a safety mix with low-volatility options.
          </div>
        </div>

        <div className="card">
          <SectionHeader title="Top Rated ELSS Snapshot" subtitle="Illustrative market snapshot" />
          {TOP_ELSS_FUNDS.map((fund, idx) => (
            <div key={idx} style={{ borderBottom: idx === TOP_ELSS_FUNDS.length - 1 ? 'none' : '1px solid var(--border-2)', padding: '10px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{fund.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>NAV: <strong style={{ color: 'var(--ink)' }}>Rs {fund.nav}</strong></span>
                <span style={{ color: 'var(--muted)' }}>1Y: <strong style={{ color: fund.oneYear >= 0 ? 'var(--green)' : 'var(--red)' }}>{fund.oneYear}%</strong></span>
                <span style={{ color: 'var(--muted)' }}>3Y: <strong style={{ color: fund.threeYear >= 0 ? 'var(--green)' : 'var(--red)' }}>{fund.threeYear}%</strong></span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>Returns are indicative and not guaranteed.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="How Tax Saving Options Compare" subtitle="Lock-in, return band, and tax benefit side-by-side" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-3)' }}>
                <th style={{ textAlign: 'left', padding: 10 }}>Investment</th>
                <th style={{ textAlign: 'left', padding: 10 }}>Lock-in</th>
                <th style={{ textAlign: 'left', padding: 10 }}>Historical Return Band</th>
                <th style={{ textAlign: 'left', padding: 10 }}>Tax Benefit</th>
              </tr>
            </thead>
            <tbody>
              {TAX_SAVING_OPTIONS.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-2)', background: idx === 0 ? 'rgba(245, 158, 11, 0.16)' : 'transparent' }}>
                  <td style={{ padding: 10, fontWeight: idx === 0 ? 700 : 500 }}>{row.investment}</td>
                  <td style={{ padding: 10 }}>{row.lockIn}</td>
                  <td style={{ padding: 10 }}>{row.returns}</td>
                  <td style={{ padding: 10 }}>{row.taxBenefit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Disclaimer text="Educational comparison only. Always evaluate risk, lock-in, and suitability before investing." />
    </div>
  )
}
