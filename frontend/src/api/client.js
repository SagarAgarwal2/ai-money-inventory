const BASE_URL = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'API error')
  }
  return res.json()
}

// Portfolio X-Ray
export const portfolioApi = {
  analyze: (file, age = 35) => {
    const form = new FormData()
    form.append('file', file)
    return request(`/portfolio/analyze?user_age=${age}`, { method: 'POST', body: form })
  },
}

// FIRE Planner
export const fireApi = {
  plan: (inputs) => request('/fire/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  }),
}

// Money Health Score
export const healthApi = {
  score: (inputs) => request('/health/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  }),
}

// Market
export const marketApi = {
  stats: () => request('/market/stats'),
  search: (q) => request(`/market/nav/search?q=${encodeURIComponent(q)}`),
}

// Format helpers
export const fmt = {
  inr: (n) => {
    if (!n && n !== 0) return '—'
    const abs = Math.abs(n)
    if (abs >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
    if (abs >= 100000) return `₹${(n / 100000).toFixed(2)} L`
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  },
  pct: (n, decimals = 1) => n != null ? `${n > 0 ? '+' : ''}${Number(n).toFixed(decimals)}%` : '—',
  num: (n) => n?.toLocaleString('en-IN') ?? '—',
}
