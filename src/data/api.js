// API service for fetching live theme performance data from the backend

const API_BASE = '/api'

export async function fetchThemePerformance(startDate, endDate) {
  const res = await fetch(`${API_BASE}/themes?startDate=${startDate}&endDate=${endDate}`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
  return res.json()
}

export async function fetchStockFinancials(companyName) {
  const res = await fetch(`${API_BASE}/stock/${encodeURIComponent(companyName)}/financials`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
  return res.json()
}

export async function fetchPeerComparison() {
  const res = await fetch(`${API_BASE}/peer-comparison`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchFundHistory(ticker) {
  const res = await fetch(`${API_BASE}/fund/${encodeURIComponent(ticker)}/history`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`)
    if (!res.ok) return false
    const data = await res.json()
    return data.status === 'ok'
  } catch {
    return false
  }
}
