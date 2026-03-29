import { BarChart3, BookOpenText, ExternalLink, Newspaper, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { fmt, marketApi } from '../api/client.js'
import { Disclaimer, LoadingState, SectionHeader, Tag } from '../components/UI.jsx'

const BLOG_LINKS = [
  {
    category: 'Market',
    title: 'AMFI NAV Feed (Official Daily NAV Source)',
    summary: 'Direct source for daily mutual fund NAV values used across market snapshots.',
    source: 'AMFI',
    url: 'https://www.amfiindia.com/net-asset-value/nav-history',
  },
  {
    category: 'Market',
    title: 'NSE India Market Overview',
    summary: 'Track broad market behavior, index movement, and exchange-level updates.',
    source: 'NSE',
    url: 'https://www.nseindia.com/market-data/live-equity-market',
  },
  {
    category: 'SIP',
    title: 'SEBI Investor Education: Mutual Funds and SIP Basics',
    summary: 'Beginner-friendly educational material explaining mutual funds and SIP discipline.',
    source: 'SEBI Investor',
    url: 'https://investor.sebi.gov.in/',
  },
  {
    category: 'SIP',
    title: 'AMFI Investor Corner',
    summary: 'Official investor resources, mutual fund concepts, and practical education guides.',
    source: 'AMFI',
    url: 'https://www.amfiindia.com/investor-corner',
  },
  {
    category: 'Stocks',
    title: 'BSE India Market Data',
    summary: 'Stock-market quotes, movers, and exchange data from BSE reference pages.',
    source: 'BSE',
    url: 'https://www.bseindia.com/markets/equity/EQReports/marketwatch.aspx',
  },
  {
    category: 'Stocks',
    title: 'RBI Financial Markets Dashboard',
    summary: 'Macro context for rates, liquidity, and broader financial market developments.',
    source: 'RBI',
    url: 'https://www.rbi.org.in/',
  },
]

function normalizeFunds(items) {
  if (!Array.isArray(items)) return []
  return items
    .filter((f) => f && typeof f === 'object')
    .map((f) => ({
      scheme_name: String(f.scheme_name || 'Unknown Fund'),
      nav: typeof f.nav === 'number' ? f.nav : null,
      nav_date: String(f.nav_date || ''),
      amc: String(f.amc || ''),
    }))
}

export default function MarketBlog() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [marketStats, setMarketStats] = useState(null)
  const [elssFunds, setElssFunds] = useState([])
  const [niftyFunds, setNiftyFunds] = useState([])
  const [largeCapFunds, setLargeCapFunds] = useState([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [stats, elss, nifty, largeCap] = await Promise.all([
          marketApi.stats(),
          marketApi.search('elss'),
          marketApi.search('nifty'),
          marketApi.search('large cap'),
        ])

        setMarketStats(stats)
        setElssFunds(normalizeFunds(elss?.results))
        setNiftyFunds(normalizeFunds(nifty?.results))
        setLargeCapFunds(normalizeFunds(largeCap?.results))
      } catch (e) {
        setError(e.message || 'Unable to load blog insights right now.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const sipInsights = useMemo(() => {
    const topElss = elssFunds.slice(0, 3)
    return [
      {
        title: 'Start with small SIP, increase yearly',
        detail: 'A step-up SIP approach helps beginners build discipline without cashflow stress.',
      },
      {
        title: 'ELSS can combine tax saving and growth',
        detail: 'ELSS funds qualify under Section 80C and have a 3-year lock-in, which is the shortest among many tax-saving instruments.',
      },
      {
        title: 'Diversify SIP buckets',
        detail: 'Use a core index/large-cap SIP and add a smaller satellite allocation to flexi/mid-cap based on risk profile.',
      },
      {
        title: 'Top ELSS names currently in focus',
        detail: topElss.length > 0
          ? topElss.map((f) => f.scheme_name).join(' | ')
          : 'No ELSS snapshot available at the moment.',
      },
    ]
  }, [elssFunds])

  if (loading) return <LoadingState message="Loading market blog insights..." />

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>Investment Blog</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          Latest market details, SIP analysis, and stock-market watch insights for retail investors.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: 'var(--red-light)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ffb5b5' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
        <MetricCard icon={Newspaper} title="Data Source" value={marketStats?.data_source || 'AMFI'} accent="var(--accent)" />
        <MetricCard icon={BarChart3} title="Funds Tracked" value={String(marketStats?.total_funds || 0)} accent="var(--green)" />
        <MetricCard icon={BookOpenText} title="SIP Insights" value="Live + curated" accent="var(--purple)" />
        <MetricCard icon={TrendingUp} title="Market Focus" value="ELSS | Nifty | Large Cap" accent="var(--amber)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <SectionHeader title="Latest Market Details" subtitle="Quick AMFI-based market snapshot" />
          <Info label="Snapshot Time" value={new Date().toLocaleString()} />
          <Info label="Coverage" value={`${marketStats?.total_funds || 0} mutual fund schemes`} />
          <Info label="Update Note" value={marketStats?.note || 'Live NAV data from AMFI feed'} />
        </div>

        <div className="card">
          <SectionHeader title="SIP Analysis" subtitle="Actionable guidance for consistent investing" />
          {sipInsights.map((item, i) => (
            <div key={i} style={{ borderBottom: i === sipInsights.length - 1 ? 'none' : '1px solid var(--border-2)', padding: '10px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="Latest Stocks Market Watch" subtitle="Stock-market oriented funds and index trackers" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <FundList title="Nifty / Index Focus" tag="Index" funds={niftyFunds.slice(0, 5)} />
          <FundList title="Large Cap Focus" tag="Equity" funds={largeCapFunds.slice(0, 5)} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <SectionHeader title="Latest Articles and Links" subtitle="Curated reading list for market updates, SIP learning, and stock tracking" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {BLOG_LINKS.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: 12,
                display: 'block',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                e.currentTarget.style.borderColor = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Tag color={item.category === 'Market' ? 'blue' : item.category === 'SIP' ? 'green' : 'amber'}>{item.category}</Tag>
                <ExternalLink size={14} color="var(--muted)" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10 }}>{item.summary}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Source: {item.source}</div>
            </a>
          ))}
        </div>
      </div>

      <Disclaimer text="This section is informational. It is not SEBI-registered investment advice." />
    </div>
  )
}

function MetricCard({ icon: Icon, title, value, accent }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${accent}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        <Icon size={16} color={accent} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border-2)', padding: '8px 0' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 13, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function FundList({ title, tag, funds }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>{title}</strong>
        <Tag color="blue">{tag}</Tag>
      </div>
      {funds.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>No data available right now.</div>
      ) : (
        funds.map((fund, idx) => (
          <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{fund.scheme_name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
              <span>NAV: {fund.nav == null ? '—' : fmt.inr(fund.nav)}</span>
              <span>Date: {fund.nav_date || '—'}</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
