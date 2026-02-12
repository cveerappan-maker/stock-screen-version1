import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, Cell, ReferenceLine, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { fetchPeerComparison, fetchFundHistory } from '../data/api'

const FUND_COLORS = {
  DHIAX: '#3b82f6', // Blue - our fund
  OAKIX: '#f59e0b', // Amber
  DODFX: '#10b981', // Emerald
  ARTIX: '#8b5cf6', // Purple
  TFISX: '#ef4444', // Red
  FIVFX: '#ec4899', // Pink
  ACWX: '#94a3b8',  // Gray - benchmark
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-neutral mt-0.5">{subtitle}</p>}
    </div>
  )
}

function SectorComparisonChart({ funds, activeSectorWeights }) {
  // Build data for grouped bar chart
  const sectors = Object.keys(activeSectorWeights || {}).sort()
  const data = sectors.map(sector => {
    const row = { sector }
    for (const [ticker, fund] of Object.entries(funds)) {
      row[ticker] = fund.sectorWeights?.[sector] || 0
    }
    return row
  })

  const fundTickers = Object.keys(funds).filter(t => funds[t])

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 mb-4">
      <SectionHeader
        title="Sector Allocation Comparison"
        subtitle="DHIAX vs peers vs MSCI ACWI ex-US benchmark (ACWX)"
      />
      <div style={{ height: Math.max(400, sectors.length * 45) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={v => `${v}%`}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#243044' }}
            />
            <YAxis
              type="category"
              dataKey="sector"
              width={150}
              tick={{ fill: '#e2e8f0', fontSize: 10 }}
              axisLine={{ stroke: '#243044' }}
              interval={0}
            />
            <Tooltip
              contentStyle={{ background: '#1a2235', border: '1px solid #243044', borderRadius: 8, fontSize: 11 }}
              formatter={(val, name) => [`${val.toFixed(1)}%`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {fundTickers.map(ticker => (
              <Bar key={ticker} dataKey={ticker} fill={FUND_COLORS[ticker] || '#666'} barSize={6} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ActiveWeightsChart({ activeSectorWeights }) {
  if (!activeSectorWeights || Object.keys(activeSectorWeights).length === 0) return null

  const data = Object.entries(activeSectorWeights)
    .map(([sector, w]) => ({
      sector,
      active: w.active,
      fund: w.fund,
      benchmark: w.benchmark,
    }))
    .sort((a, b) => b.active - a.active)

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 mb-4">
      <SectionHeader
        title="DHIAX Active Sector Weights vs Benchmark"
        subtitle="Overweight (green) and underweight (red) positions relative to MSCI ACWI ex-US"
      />
      <div style={{ height: Math.max(300, data.length * 36) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#243044' }}
            />
            <YAxis
              type="category"
              dataKey="sector"
              width={150}
              tick={{ fill: '#e2e8f0', fontSize: 11 }}
              axisLine={{ stroke: '#243044' }}
              interval={0}
            />
            <Tooltip
              contentStyle={{ background: '#1a2235', border: '1px solid #243044', borderRadius: 8, fontSize: 11 }}
              formatter={(val) => [`${val > 0 ? '+' : ''}${val.toFixed(2)}%`, 'Active Weight']}
            />
            <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <Bar dataKey="active" barSize={18} radius={[0, 4, 4, 0]}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.active >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function HoldingsOverlapTable({ holdingsOverlap, funds }) {
  if (!holdingsOverlap || holdingsOverlap.length === 0) return null

  const fundTickers = Object.keys(funds).filter(t => funds[t])
  // Show holdings held by 2+ funds
  const shared = holdingsOverlap.filter(h => h.funds.length >= 2).slice(0, 25)

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 mb-4">
      <SectionHeader
        title="Holdings Overlap Matrix"
        subtitle="Stocks held by multiple funds — weight shown if held, darker = higher conviction"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-dark-600">
              <th className="text-left px-3 py-2 text-neutral uppercase tracking-wider font-medium">Stock</th>
              <th className="text-left px-3 py-2 text-neutral uppercase tracking-wider font-medium">#Funds</th>
              {fundTickers.map(t => (
                <th key={t} className="text-center px-2 py-2 font-medium" style={{ color: FUND_COLORS[t] }}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shared.map(holding => {
              const fundMap = {}
              holding.funds.forEach(f => { fundMap[f.ticker] = f.weight })
              return (
                <tr key={holding.symbol} className="border-b border-dark-700 hover:bg-dark-700">
                  <td className="px-3 py-2 text-white font-medium">{holding.name}</td>
                  <td className="px-3 py-2 text-neutral">{holding.funds.length}</td>
                  {fundTickers.map(t => {
                    const w = fundMap[t]
                    return (
                      <td key={t} className="text-center px-2 py-2">
                        {w != null ? (
                          <span
                            className="inline-block px-1.5 py-0.5 rounded text-white font-medium"
                            style={{
                              backgroundColor: FUND_COLORS[t],
                              opacity: 0.4 + Math.min(w / 8, 0.6),
                            }}
                          >
                            {w.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-dark-500">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConvictionPositions({ positions }) {
  if (!positions || positions.length === 0) return null

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 mb-4">
      <SectionHeader
        title="DHIAX Conviction Positions (Off-Benchmark)"
        subtitle="Top holdings in DHIAX that are NOT in the benchmark's top holdings — potential alpha sources"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {positions.map(h => (
          <div key={h.symbol} className="bg-dark-700 rounded-lg px-3 py-2">
            <p className="text-xs text-white font-medium truncate">{h.name}</p>
            <p className="text-[10px] text-neutral">{h.symbol}</p>
            <p className="text-xs font-semibold text-accent">{h.weight.toFixed(2)}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function EquityCharacteristicsTable({ funds }) {
  const fundEntries = Object.entries(funds).filter(([, v]) => v?.equityCharacteristics)

  const metrics = [
    { key: 'priceToEarnings', label: 'P/E Ratio', fmt: v => v?.toFixed(1) + 'x' },
    { key: 'priceToBook', label: 'P/B Ratio', fmt: v => v?.toFixed(2) + 'x' },
    { key: 'priceToSales', label: 'P/S Ratio', fmt: v => v?.toFixed(2) + 'x' },
    { key: 'priceToCashflow', label: 'P/CF Ratio', fmt: v => v?.toFixed(1) + 'x' },
    { key: 'threeYearEarningsGrowth', label: '3Y Earnings Growth', fmt: v => v?.toFixed(1) + '%' },
  ]

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 mb-4">
      <SectionHeader
        title="Portfolio Characteristics Comparison"
        subtitle="Valuation and growth metrics across funds"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-dark-600">
              <th className="text-left px-3 py-2 text-neutral uppercase font-medium">Metric</th>
              {fundEntries.map(([t]) => (
                <th key={t} className="text-center px-3 py-2 font-medium" style={{ color: FUND_COLORS[t] }}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.key} className="border-b border-dark-700">
                <td className="px-3 py-2 text-white font-medium">{m.label}</td>
                {fundEntries.map(([t, fund]) => {
                  const val = fund.equityCharacteristics[m.key]
                  return (
                    <td key={t} className="text-center px-3 py-2 text-neutral">
                      {val != null ? m.fmt(val) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PeerTiltsHeatmap({ peerSectorTilts, funds }) {
  if (!peerSectorTilts) return null
  const peerTickers = Object.keys(peerSectorTilts)
  const sectors = [...new Set(peerTickers.flatMap(t => Object.keys(peerSectorTilts[t])))]
    .filter(s => s && s !== 'undefined')
    .sort()

  if (sectors.length === 0) return null

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 mb-4">
      <SectionHeader
        title="Peer Sector Tilts vs Benchmark"
        subtitle="Active sector bets across all peers — green = overweight, red = underweight vs ACWX"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-dark-600">
              <th className="text-left px-2 py-2 text-neutral uppercase font-medium">Sector</th>
              {peerTickers.map(t => (
                <th key={t} className="text-center px-2 py-2 font-medium" style={{ color: FUND_COLORS[t] }}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sectors.map(sector => (
              <tr key={sector} className="border-b border-dark-700">
                <td className="px-2 py-1.5 text-white font-medium text-xs">{sector}</td>
                {peerTickers.map(t => {
                  const val = peerSectorTilts[t]?.[sector] || 0
                  const intensity = Math.min(Math.abs(val) / 8, 1)
                  const bg = val >= 0
                    ? `rgba(34,197,94,${intensity * 0.5})`
                    : `rgba(239,68,68,${intensity * 0.5})`
                  return (
                    <td key={t} className="text-center px-2 py-1.5" style={{ backgroundColor: bg }}>
                      <span className={val >= 0 ? 'text-gain' : 'text-loss'}>
                        {val > 0 ? '+' : ''}{val.toFixed(1)}%
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InsightsPanel({ data }) {
  if (!data?.funds?.DHIAX || !data?.funds?.ACWX) return null

  const dhiax = data.funds.DHIAX
  const bench = data.funds.ACWX
  const active = data.activeSectorWeights || {}
  const peers = data.peerSectorTilts || {}

  const insights = []

  // Find biggest overweights/underweights
  const sorted = Object.entries(active).sort((a, b) => Math.abs(b[1].active) - Math.abs(a[1].active))
  const biggestOW = sorted.find(([, w]) => w.active > 1)
  const biggestUW = sorted.find(([, w]) => w.active < -1)

  if (biggestOW) {
    insights.push({
      type: 'overweight',
      title: `Largest Overweight: ${biggestOW[0]}`,
      detail: `DHIAX is +${biggestOW[1].active.toFixed(1)}% overweight vs benchmark (${biggestOW[1].fund.toFixed(1)}% vs ${biggestOW[1].benchmark.toFixed(1)}%).`,
      action: 'Monitor — ensure thesis still holds. Consider trimming if peers are reducing exposure.',
    })
  }

  if (biggestUW) {
    insights.push({
      type: 'underweight',
      title: `Largest Underweight: ${biggestUW[0]}`,
      detail: `DHIAX is ${biggestUW[1].active.toFixed(1)}% underweight vs benchmark (${biggestUW[1].fund.toFixed(1)}% vs ${biggestUW[1].benchmark.toFixed(1)}%).`,
      action: 'Evaluate if this is intentional avoidance or a gap. Check if peers are finding opportunities here.',
    })
  }

  // Check where peers agree on a tilt but DHIAX doesn't
  for (const sector of Object.keys(active)) {
    const dhiaxTilt = active[sector]?.active || 0
    const peerTilts = Object.values(peers).map(p => p[sector] || 0)
    const avgPeerTilt = peerTilts.length > 0 ? peerTilts.reduce((s, v) => s + v, 0) / peerTilts.length : 0

    if (Math.abs(avgPeerTilt) > 2 && Math.sign(avgPeerTilt) !== Math.sign(dhiaxTilt) && Math.abs(dhiaxTilt) < 1) {
      insights.push({
        type: avgPeerTilt > 0 ? 'opportunity' : 'contrarian',
        title: `Peer Consensus Divergence: ${sector}`,
        detail: `Peers average ${avgPeerTilt > 0 ? '+' : ''}${avgPeerTilt.toFixed(1)}% tilt while DHIAX is at ${dhiaxTilt > 0 ? '+' : ''}${dhiaxTilt.toFixed(1)}%.`,
        action: avgPeerTilt > 0
          ? 'Peers see opportunity here that DHIAX may be missing — worth researching.'
          : 'DHIAX holds steady while peers are cutting — could be a contrarian advantage.',
      })
    }
  }

  // Holdings overlap insight
  const sharedWithMost = (data.holdingsOverlap || [])
    .filter(h => h.funds.some(f => f.ticker === 'DHIAX'))
    .filter(h => h.funds.length >= 4)
  if (sharedWithMost.length > 0) {
    insights.push({
      type: 'crowded',
      title: 'Crowded Positions',
      detail: `${sharedWithMost.length} of DHIAX's top holdings are also held by 3+ peers: ${sharedWithMost.slice(0, 3).map(h => h.name).join(', ')}${sharedWithMost.length > 3 ? '...' : ''}.`,
      action: 'Crowded names may offer less alpha. Look for differentiated ideas among conviction positions.',
    })
  }

  // Conviction positions
  if (data.dhiaxConvictionPositions?.length > 0) {
    insights.push({
      type: 'alpha',
      title: `${data.dhiaxConvictionPositions.length} Off-Benchmark Conviction Positions`,
      detail: `DHIAX holds ${data.dhiaxConvictionPositions.map(h => h.name).slice(0, 4).join(', ')} which are not in the benchmark top holdings.`,
      action: 'These are your differentiated alpha bets. Double down on high-conviction names with strong fundamentals.',
    })
  }

  // Valuation comparison
  const dhPE = dhiax.equityCharacteristics?.priceToEarnings
  const benchPE = bench.equityCharacteristics?.priceToEarnings
  if (dhPE && benchPE) {
    const discount = ((dhPE - benchPE) / benchPE * 100).toFixed(0)
    insights.push({
      type: Number(discount) < 0 ? 'positive' : 'caution',
      title: 'Portfolio Valuation',
      detail: `DHIAX trades at ${dhPE.toFixed(1)}x P/E vs benchmark ${benchPE.toFixed(1)}x (${discount}% ${Number(discount) < 0 ? 'discount' : 'premium'}).`,
      action: Number(discount) < 0
        ? 'Value discipline intact. Attractive entry points relative to market.'
        : 'Portfolio is richer than benchmark — ensure growth justifies premium.',
    })
  }

  const typeColors = {
    overweight: 'border-l-amber-500',
    underweight: 'border-l-blue-500',
    opportunity: 'border-l-green-500',
    contrarian: 'border-l-purple-500',
    crowded: 'border-l-red-500',
    alpha: 'border-l-emerald-500',
    positive: 'border-l-green-500',
    caution: 'border-l-amber-500',
  }

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 mb-4">
      <SectionHeader
        title="Actionable Insights"
        subtitle="Data-driven observations for portfolio positioning"
      />
      <div className="space-y-3">
        {insights.map((ins, i) => (
          <div
            key={i}
            className={`bg-dark-700 rounded-lg border-l-4 ${typeColors[ins.type] || 'border-l-neutral'} p-4`}
          >
            <h5 className="text-sm font-semibold text-white mb-1">{ins.title}</h5>
            <p className="text-xs text-neutral mb-2">{ins.detail}</p>
            <p className="text-xs text-accent-light italic">{ins.action}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PeerAnalysisPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetchPeerComparison()
      .then(setData)
      .catch(err => {
        console.error('Peer comparison failed:', err)
        setError('Could not load peer comparison. Make sure the backend server is running (npm run server).')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-accent animate-pulse text-lg mb-2">Loading peer comparison data...</p>
          <p className="text-xs text-neutral">Fetching fund holdings from Yahoo Finance for 7 funds</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-loss text-lg mb-2">Failed to load data</p>
          <p className="text-xs text-neutral">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const dhiax = data.funds?.DHIAX
  const benchmark = data.funds?.ACWX

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">DHIAX Competitive Analysis</h2>
        <p className="text-sm text-neutral mt-1">
          Diamond Hill International Fund vs peer group vs MSCI ACWI ex-US
          <span className="ml-2 text-gain text-xs font-medium px-2 py-0.5 bg-gain/10 rounded-full">
            LIVE DATA
          </span>
        </p>
      </div>

      {/* Fund summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-lg border border-dark-600 p-4">
          <p className="text-xs text-neutral uppercase tracking-wider mb-1">Funds Compared</p>
          <p className="text-xl font-bold text-white">{Object.keys(data.funds || {}).length}</p>
        </div>
        <div className="bg-dark-800 rounded-lg border border-dark-600 p-4">
          <p className="text-xs text-neutral uppercase tracking-wider mb-1">DHIAX P/E</p>
          <p className="text-xl font-bold text-accent">
            {dhiax?.equityCharacteristics?.priceToEarnings?.toFixed(1) || '—'}x
          </p>
        </div>
        <div className="bg-dark-800 rounded-lg border border-dark-600 p-4">
          <p className="text-xs text-neutral uppercase tracking-wider mb-1">Benchmark P/E</p>
          <p className="text-xl font-bold text-neutral">
            {benchmark?.equityCharacteristics?.priceToEarnings?.toFixed(1) || '—'}x
          </p>
        </div>
        <div className="bg-dark-800 rounded-lg border border-dark-600 p-4">
          <p className="text-xs text-neutral uppercase tracking-wider mb-1">Off-Benchmark Bets</p>
          <p className="text-xl font-bold text-gain">{data.dhiaxConvictionPositions?.length || 0}</p>
        </div>
      </div>

      {/* Actionable Insights - put at the top for the PM */}
      <InsightsPanel data={data} />

      {/* Active Weights */}
      <ActiveWeightsChart activeSectorWeights={data.activeSectorWeights} />

      {/* Sector Comparison */}
      <SectorComparisonChart funds={data.funds} activeSectorWeights={data.activeSectorWeights} />

      {/* Peer Sector Tilts Heatmap */}
      <PeerTiltsHeatmap peerSectorTilts={data.peerSectorTilts} funds={data.funds} />

      {/* Equity Characteristics */}
      <EquityCharacteristicsTable funds={data.funds} />

      {/* Holdings Overlap */}
      <HoldingsOverlapTable holdingsOverlap={data.holdingsOverlap} funds={data.funds} />

      {/* Conviction Positions */}
      <ConvictionPositions positions={data.dhiaxConvictionPositions} />

      {/* Top Holdings Tables */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 mb-4">
        <SectionHeader
          title="Top Holdings by Fund"
          subtitle="Top 10 holdings for each fund in the comparison set"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(data.funds || {}).map(([ticker, fund]) => {
            if (!fund?.holdings?.length) return null
            return (
              <div key={ticker} className="bg-dark-700 rounded-lg p-3">
                <h5 className="text-xs font-bold mb-2" style={{ color: FUND_COLORS[ticker] }}>
                  {ticker} — {fund.name}
                  {fund.style && <span className="text-neutral font-normal ml-1">({fund.style})</span>}
                </h5>
                <table className="w-full text-[11px]">
                  <tbody>
                    {fund.holdings.slice(0, 10).map((h, i) => (
                      <tr key={i} className="border-b border-dark-600">
                        <td className="py-1 text-neutral w-5">{i + 1}</td>
                        <td className="py-1 text-white">{h.name}</td>
                        <td className="py-1 text-neutral text-right">{h.weight.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-[10px] text-neutral/50 text-center mt-6 mb-4">
        Data sourced from Yahoo Finance. Holdings reflect most recent available filing.
        Generated {data.generatedAt ? new Date(data.generatedAt).toLocaleDateString() : 'today'}.
      </p>
    </div>
  )
}
