import { AlertTriangle, CheckCircle, RefreshCw, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
    Bar,
    BarChart,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis, YAxis
} from 'recharts'
import { fmt, portfolioApi } from '../api/client.js'
import { Disclaimer, InfoRow, LoadingState, PriorityBadge, SectionHeader, StatCard, Tag } from '../components/UI.jsx'

const CAT_COLORS = { 'Large Cap': '#1a56db', 'Mid Cap': '#7c3aed', 'Small Cap': '#e02424', 'Flexi Cap': '#0d9f6e', 'ELSS': '#d97706', 'Debt': '#0891b2', 'Hybrid': '#f97316', 'Index Fund': '#6366f1', 'Other': '#9aa0ae' }
const PORTFOLIO_STORAGE_KEY = 'amm_portfolio_analysis'

export default function PortfolioXRay() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY)
      if (saved) setData(JSON.parse(saved))
    } catch {
      localStorage.removeItem(PORTFOLIO_STORAGE_KEY)
    }
  }, [])

  async function handleFile(file) {
    if (!file?.name.endsWith('.pdf')) return alert('Please upload a PDF file')
    setLoading(true)
    try {
      const result = await portfolioApi.analyze(file)
      setData(result)
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(result))
    } catch (e) {
      alert(e.message)
    }
    setLoading(false)
  }

  if (loading) return <LoadingState message="Running portfolio X-Ray analysis…" />

  if (!data) return <UploadView onFile={handleFile} dragging={dragging} setDragging={setDragging} />

  return <AnalysisView data={data} activeTab={activeTab} setActiveTab={setActiveTab} onReset={() => {
    setData(null)
    localStorage.removeItem(PORTFOLIO_STORAGE_KEY)
  }} />
}

function UploadView({ onFile, dragging, setDragging }) {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Portfolio X-Ray</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>Upload your real CAMS consolidated account statement for a complete portfolio analysis</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        <div
          className="card"
          style={{ border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`, background: dragging ? 'var(--accent-light)' : 'var(--surface)', transition: 'all 0.2s', cursor: 'pointer', minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0]) }}
          onClick={() => document.getElementById('pdf-input').click()}
        >
          <input id="pdf-input" type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => onFile(e.target.files[0])} />
          <div style={{ width: 64, height: 64, background: 'var(--accent-light)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={28} color="var(--accent)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Upload CAMS Statement</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Drag & drop or click to browse<br />PDF format · Max 10MB</div>
          </div>
          <button className="btn btn-primary">Choose PDF File</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-3)', border: 'none' }}>
        <div style={{ width: 36, height: 36, background: 'var(--bg-card)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}>🔒</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--ink)' }}>Privacy First:</strong> Your CAMS PDF is processed entirely in memory. PII (name, PAN, folio numbers) is stripped before any analysis. Zero data stored post-processing.
        </div>
      </div>
    </div>
  )
}

function AnalysisView({ data, activeTab, setActiveTab, onReset }) {
  const tabs = ['overview', 'xirr', 'overlap', 'expenses', 'rebalancing']
  const xirr = data.portfolio_xirr || {}
  const summary = data.summary || {}
  const xirr_gap = data.xirr_vs_benchmark || 0

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Portfolio X-Ray</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>{data.investor_name} · {summary.num_funds} funds · Analyzed with live AMFI NAV</p>
        </div>
        <button className="btn btn-outline" onClick={onReset} style={{ gap: 6 }}>
          <RefreshCw size={14} /> New Analysis
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard label="Current Value" value={fmt.inr(summary.total_current_value)} sub={`Invested: ${fmt.inr(summary.total_invested)}`} trend={1} color="var(--accent)" />
        <StatCard label="Total Gain" value={fmt.inr(summary.total_gain)} sub={`${fmt.pct(summary.total_gain_pct)} absolute return`} trend={summary.total_gain > 0 ? 1 : -1} color={summary.total_gain > 0 ? 'var(--green)' : 'var(--red)'} />
        <StatCard label="Portfolio XIRR" value={`${xirr.xirr}%`} sub={`Benchmark: 14.5% | Gap: ${fmt.pct(xirr_gap)}`} trend={xirr_gap} color={xirr_gap > 0 ? 'var(--green)' : 'var(--amber)'} />
        <StatCard label="Expense Drag/yr" value={fmt.inr(data.expense_drag?.total_annual_drag_inr)} sub={`Save ${fmt.inr(data.expense_drag?.total_potential_saving_inr)} → direct plans`} trend={-1} color="var(--red)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize', color: activeTab === tab ? 'var(--accent)' : 'var(--muted)', borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent', transition: 'all 0.15s', marginBottom: -1 }}>
            {tab === 'xirr' ? 'XIRR Breakdown' : tab === 'overlap' ? 'Overlap Analysis' : tab === 'expenses' ? 'Expense Drag' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab data={data} />}
      {activeTab === 'xirr' && <XirrTab data={data} />}
      {activeTab === 'overlap' && <OverlapTab data={data} />}
      {activeTab === 'expenses' && <ExpenseTab data={data} />}
      {activeTab === 'rebalancing' && <RebalancingTab data={data} />}

      <Disclaimer text={data.sebi_disclaimer} />
    </div>
  )
}

function OverviewTab({ data }) {
  const alloc = data.asset_allocation?.current_allocation || {}
  const target = data.asset_allocation?.target_allocation || {}
  const pieData = Object.entries(alloc).map(([k, v]) => ({ name: k, value: v }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
      <div className="card">
        <SectionHeader title="Asset Allocation" subtitle={`Current vs age-appropriate target (deviation: ${data.asset_allocation?.equity_deviation_pct > 0 ? '+' : ''}${data.asset_allocation?.equity_deviation_pct}% equity)`} />
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3} label={({ name, value }) => `${name}: ${value}%`} labelLine={false}>
              {pieData.map((e, i) => <Cell key={i} fill={Object.values(CAT_COLORS)[i % Object.values(CAT_COLORS).length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [`${v}%`, '']} />
          </PieChart>
        </ResponsiveContainer>
        {data.asset_allocation?.rebalance_actions?.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'var(--amber-light)', borderRadius: 'var(--radius-sm)', marginTop: 12, fontSize: 13 }}>
            <AlertTriangle size={14} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div><strong>{a.action}</strong><br /><span style={{ color: 'var(--muted)' }}>{a.recommendation}</span></div>
          </div>
        ))}
      </div>

      <div className="card">
        <SectionHeader title="Fund Summary" />
        {data.fund_xirr_breakdown?.map((f, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-2)' }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {f.scheme_name.split(' - ')[0]}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                <Tag color={CAT_COLORS[f.category] ? 'blue' : 'purple'}>{f.category}</Tag>
                {f.scheme_name.includes('Regular') && <Tag color="amber">Regular Plan</Tag>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: f.xirr > 14.5 ? 'var(--green)' : f.xirr > 10 ? 'var(--amber)' : 'var(--red)' }}>{f.xirr}%</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>XIRR · {fmt.inr(f.current_value)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function XirrTab({ data }) {
  const funds = data.fund_xirr_breakdown || []
  const chartData = funds.map(f => ({
    name: f.scheme_name.split(' ')[0] + ' ' + f.scheme_name.split(' ')[1],
    xirr: f.xirr,
    benchmark: 14.5,
  }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
      <div className="card">
        <SectionHeader title="XIRR vs Benchmark" subtitle="Extended Internal Rate of Return — accurate returns accounting for timing of each SIP" />
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ left: 0, right: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis unit="%" tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${v}%`]} />
            <Bar dataKey="xirr" name="Your XIRR" radius={[4, 4, 0, 0]}>
              {chartData.map((e, i) => <Cell key={i} fill={e.xirr >= 14.5 ? 'var(--green)' : e.xirr >= 10 ? 'var(--amber)' : 'var(--red)'} />)}
            </Bar>
            <Bar dataKey="benchmark" name="Nifty 50 TRI" fill="var(--accent)" opacity={0.35} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <SectionHeader title="Fund-wise XIRR Details" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {funds.map((f, i) => (
            <div key={i} style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${f.xirr > 14.5 ? 'var(--green)' : f.xirr > 10 ? 'var(--amber)' : 'var(--red)'}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, lineHeight: 1.3 }}>{f.scheme_name.split(' - ')[0]}</div>
              <InfoRow label="XIRR" value={`${f.xirr}%`} valueColor={f.xirr > 14.5 ? 'var(--green)' : f.xirr > 10 ? 'var(--amber)' : 'var(--red)'} />
              <InfoRow label="Invested" value={fmt.inr(f.total_invested)} />
              <InfoRow label="Current Value" value={fmt.inr(f.current_value)} />
              <InfoRow label="Gain" value={fmt.inr(f.unrealized_gain)} valueColor={f.unrealized_gain > 0 ? 'var(--green)' : 'var(--red)'} />
              <InfoRow label="Abs Return" value={`${f.absolute_return_pct}%`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OverlapTab({ data }) {
  const overlap = data.overlap_analysis || {}
  const names = overlap.fund_names || []
  const matrix = overlap.matrix || []
  const pairs = overlap.high_overlap_pairs || []
  const stocks = overlap.concentrated_stocks || []

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {pairs.length > 0 && (
        <div className="card" style={{ borderTop: '3px solid var(--red)' }}>
          <SectionHeader title="⚠️ High Overlap Pairs" subtitle="Fund pairs sharing >40% of their top-50 stock holdings — reduces diversification benefit" />
          {pairs.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', marginBottom: 8, background: 'var(--red-light)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.fund_a}</div>
              <div style={{ padding: '4px 10px', background: 'var(--red)', color: 'white', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>{p.overlap_pct}% overlap</div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{p.fund_b}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <SectionHeader title="Overlap Heatmap" subtitle="Jaccard similarity between fund pairs. >40% = redundant diversification" />
        {names.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--muted)' }}>Fund</th>
                  {names.map((n, i) => <th key={i} style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--muted)', maxWidth: 70, wordBreak: 'break-word' }}>{n.split(' ')[0]}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px 8px', fontWeight: 600, fontSize: 11, color: 'var(--ink-3)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{names[i]?.split(' ')[0]}</td>
                    {row.map((val, j) => {
                      const bg = i === j ? 'rgba(148, 163, 184, 0.16)' : val > 60 ? 'rgba(239, 68, 68, 0.2)' : val > 40 ? 'rgba(245, 158, 11, 0.2)' : val > 20 ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-card)'
                      const color = i === j ? 'var(--muted)' : val > 60 ? 'var(--red)' : val > 40 ? 'var(--amber)' : 'var(--green)'
                      return <td key={j} style={{ padding: '8px', textAlign: 'center', background: bg, fontWeight: val > 40 && i !== j ? 700 : 400, color, transition: 'background 0.2s' }}>{val}%</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {stocks.length > 0 && (
        <div className="card">
          <SectionHeader title="Concentrated Stock Exposure" subtitle="Stocks appearing across multiple funds in your portfolio" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {stocks.map((s, i) => (
              <div key={i} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{s.stock}</span>
                <span style={{ fontSize: 11, padding: '2px 7px', background: s.count >= 3 ? 'var(--red-light)' : 'var(--amber-light)', color: s.count >= 3 ? 'var(--red)' : 'var(--amber)', borderRadius: 100, fontWeight: 700 }}>{s.count} funds</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ExpenseTab({ data }) {
  const drag = data.expense_drag?.fund_breakdown || []

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        <div className="card" style={{ borderTop: '3px solid var(--red)', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Total Annual Drag</div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--red)' }}>{fmt.inr(data.expense_drag?.total_annual_drag_inr)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>paid in fund management fees every year</div>
        </div>
        <div className="card" style={{ borderTop: '3px solid var(--green)', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Potential Annual Saving</div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--green)' }}>{fmt.inr(data.expense_drag?.total_potential_saving_inr)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>by switching to Direct plans (zero effort)</div>
        </div>
      </div>

      <div className="card">
        <SectionHeader title="Fund-wise Expense Analysis" />
        {drag.map((f, i) => (
          <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid var(--border-2)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.scheme_name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Tag color={f.is_regular_plan ? 'amber' : 'green'}>{f.is_regular_plan ? 'Regular Plan' : 'Direct Plan'}</Tag>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>TER: {f.ter_pct}%</span>
              </div>
              {f.is_regular_plan && f.potential_saving_annual > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--green)', background: 'var(--green-light)', padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>
                  💡 Switch to Direct → save {fmt.inr(f.potential_saving_annual)}/year
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>{fmt.inr(f.annual_drag_inr)}/yr</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{fmt.inr(f.drag_10yr_inr)} over 10yr</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RebalancingTab({ data }) {
  const recs = data.rebalancing_recommendations || []
  const alloc = data.asset_allocation || {}

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="card">
        <SectionHeader title="Allocation vs Target" subtitle={`You are ${Math.abs(alloc.equity_deviation_pct)}% ${alloc.equity_deviation_pct > 0 ? 'overweight' : 'underweight'} equity vs age-appropriate target`} />
        {Object.entries(alloc.current_allocation || {}).map(([asset, curr]) => {
          const target = alloc.target_allocation?.[asset]
          return (
            <div key={asset} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{asset}</span>
                <span style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 700 }}>{curr}%</span>
                  {target && <span style={{ color: 'var(--muted)' }}> (target {target}%)</span>}
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 99, position: 'relative' }}>
                <div style={{ height: '100%', width: `${curr}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width 0.8s' }} />
                {target && <div style={{ position: 'absolute', top: -2, bottom: -2, width: 2, left: `${target}%`, background: 'var(--muted)', borderRadius: 1 }} />}
              </div>
            </div>
          )
        })}
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>│ Vertical bar = target allocation</div>
      </div>

      {recs.length > 0 ? (
        <div className="card">
          <SectionHeader title="AI Rebalancing Recommendations" subtitle="Ranked by priority and impact" />
          {recs.map((r, i) => (
            <div key={i} style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 10, borderLeft: `3px solid ${r.priority === 'high' ? 'var(--red)' : r.priority === 'medium' ? 'var(--amber)' : 'var(--green)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Tag color={r.priority === 'high' ? 'red' : r.priority === 'medium' ? 'amber' : 'green'}>{r.type.replace(/_/g, ' ')}</Tag>
                <PriorityBadge priority={r.priority} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{r.finding}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>→ {r.action}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <CheckCircle size={32} color="var(--green)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>Portfolio looks well balanced!</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>No major rebalancing actions required at this time.</div>
        </div>
      )}
    </div>
  )
}
