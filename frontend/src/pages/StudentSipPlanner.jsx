import { BookOpen, GraduationCap, TrendingUp, Wallet } from 'lucide-react'
import { useState } from 'react'
import { plannerApi } from '../api/client.js'
import { Disclaimer, LoadingState, SectionHeader, StatCard, Tag } from '../components/UI.jsx'

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

export default function StudentSipPlanner() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const [input, setInput] = useState({
    monthly_budget: 1000,
    investment_duration: 4,
    risk_appetite: 'moderate',
    user_type: 'student',
    question: 'What is SIP?'
  })

  async function runPlanner() {
    setError('')
    setLoading(true)
    try {
      setResult(await plannerApi.studentSipPlanner(input))
    } catch (e) {
      setError(e.message || 'Failed to run Student SIP Planner')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingState message="Preparing your student SIP plan..." />

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>Student SIP Planner</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          Beginner-friendly SIP planning with estimated growth and curated learning resources.
        </p>
      </div>

      {error && <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: 'var(--red-light)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ffb5b5' }}>{error}</div>}

      <section className="card" style={{ maxWidth: 1060, width: '100%', padding: 28 }}>
        <h3 style={{ marginBottom: 16, fontSize: 24, fontWeight: 700 }}>Student Inputs</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <Field label="Monthly Budget" type="number" value={input.monthly_budget} onChange={(v) => setInput(s => ({ ...s, monthly_budget: v }))} />
          <Field label="Investment Duration (years)" type="number" value={input.investment_duration} onChange={(v) => setInput(s => ({ ...s, investment_duration: v }))} />
        </div>

        <Field label="Ask a question (example: What is SIP?)" value={input.question} onChange={(v) => setInput(s => ({ ...s, question: v }))} />

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>Risk Appetite</label>
          <select className="input" style={{ minHeight: 44, fontSize: 15 }} value={input.risk_appetite} onChange={(e) => setInput(s => ({ ...s, risk_appetite: e.target.value }))}>
            <option value="high">high</option>
            <option value="moderate">moderate</option>
            <option value="low">low</option>
          </select>
        </div>

        <button className="btn btn-primary" style={{ minHeight: 46, fontSize: 15, padding: '0 20px' }} onClick={runPlanner} disabled={loading}>
          {loading ? 'Running...' : 'Run Student Planner'}
        </button>
      </section>

      {result && <StudentResultView result={result} />}
    </div>
  )
}

function StudentResultView({ result }) {
  const sip = result.sip_plan || {}
  const resources = result.learning_resources || []
  const qaAnswers = result.qa_answers || []

  return (
    <div style={{ marginTop: 20 }}>
      <SectionHeader title="Student SIP Analysis" subtitle="Simple plan, clear projection, and structured learning path" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
        <StatCard label="Monthly SIP" value={`Rs ${sip.monthly_investment || 0}`} sub="Starter amount" icon={Wallet} color="var(--accent)" />
        <StatCard label="Timeline" value={sip.timeline || '—'} sub="Investment horizon" icon={TrendingUp} color="var(--green)" />
        <StatCard label="User Segment" value="Student" sub="Beginner-first flow" icon={GraduationCap} color="var(--purple)" />
        <StatCard label="Learning Modules" value={String(resources.length)} sub="Curated resources" icon={BookOpen} color="var(--amber)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <SectionHeader title="Allocation Strategy" />
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{sip.allocation_strategy || 'No strategy generated.'}</div>
          <div style={{ marginTop: 12, padding: 10, background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent-2)' }}>
            Start small and stay consistent. Increase SIP gradually when budget increases.
          </div>
        </div>

        <div className="card">
          <SectionHeader title="Projected Growth" />
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{sip.estimated_growth || 'No growth estimate generated.'}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="Education Hub" subtitle="Learn while you invest" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          {resources.map((item, idx) => (
            <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ fontSize: 13 }}>{item.title}</strong>
                <Tag color={item.level === 'beginner' ? 'green' : 'purple'}>{item.level}</Tag>
              </div>
              {item.category && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Category: {item.category}</div>}
              {item.answer && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.6 }}>{item.answer}</div>}
            </div>
          ))}
        </div>
      </div>

      {qaAnswers.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionHeader title="Your Questions Answered" subtitle="Groq-generated beginner-friendly explanations" />
          {qaAnswers.map((qa, idx) => (
            <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{qa.question}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>{qa.answer}</div>
            </div>
          ))}
        </div>
      )}

      <Disclaimer text="Student SIP plan is educational guidance, not guaranteed return advice." />
    </div>
  )
}
