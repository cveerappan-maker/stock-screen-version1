import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, ReferenceLine,
} from 'recharts'
import { fetchStockFinancials } from '../data/api'
import { generateDCF } from '../utils/dcfExcel'

function AggregateTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-dark-700 border border-dark-500 rounded px-3 py-2 shadow-lg">
      <p className="text-xs text-neutral">{d.date}</p>
      <p className={`text-sm font-bold ${d.value >= 0 ? 'text-gain' : 'text-loss'}`}>
        {d.value >= 0 ? '+' : ''}{d.value.toFixed(2)}%
      </p>
    </div>
  )
}

function HoldingTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-dark-700 border border-dark-500 rounded px-3 py-2 shadow-lg">
      <p className="text-xs text-white font-medium">{d.name}</p>
      <p className={`text-sm font-bold ${d.returnPct >= 0 ? 'text-gain' : 'text-loss'}`}>
        {d.returnPct >= 0 ? '+' : ''}{d.returnPct.toFixed(2)}%
      </p>
    </div>
  )
}

const IMPACT_COLORS = {
  positive: 'text-gain',
  negative: 'text-loss',
  neutral: 'text-neutral',
}

const IMPACT_ICONS = {
  positive: '\u25B2',
  negative: '\u25BC',
  neutral: '\u25CF',
}

function StockDetailPanel({ stock, onClose }) {
  const [financials, setFinancials] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dcfLoading, setDcfLoading] = useState(false)

  const loadFinancials = async () => {
    if (financials) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchStockFinancials(stock.name)
      setFinancials(data)
    } catch (err) {
      setError('Could not load financials. Ensure the backend server is running.')
      console.warn('Failed to fetch financials:', err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-load when mounted
  useEffect(() => { loadFinancials() }, [])

  const handleDCFDownload = async () => {
    if (!financials) return
    setDcfLoading(true)
    try {
      generateDCF(financials)
    } catch (err) {
      console.error('DCF generation failed:', err)
      setError('Failed to generate DCF. Some financial data may be missing.')
    } finally {
      setDcfLoading(false)
    }
  }

  return (
    <div className="mt-3 bg-dark-700 border border-dark-500 rounded-lg p-4 animate-in">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h5 className="text-sm font-bold text-white">{stock.name}</h5>
          <p className={`text-xs font-semibold ${stock.returnPct >= 0 ? 'text-gain' : 'text-loss'}`}>
            {stock.returnPct >= 0 ? '+' : ''}{stock.returnPct.toFixed(2)}% return
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-neutral hover:text-white transition-colors text-sm leading-none p-1"
        >
          &times;
        </button>
      </div>

      {loading && (
        <p className="text-xs text-accent animate-pulse">Loading financial data...</p>
      )}

      {error && (
        <p className="text-xs text-loss">{error}</p>
      )}

      {financials && (
        <>
          {/* Company info */}
          {financials.summary && (
            <p className="text-xs text-neutral/80 mb-3 leading-relaxed">
              {financials.industry && <span className="text-neutral font-medium">{financials.industry}</span>}
              {financials.industry && financials.country && ' \u00B7 '}
              {financials.country && <span>{financials.country}</span>}
              {(financials.industry || financials.country) && ' \u2014 '}
              {financials.summary}
            </p>
          )}

          {/* Performance drivers */}
          {financials.drivers && financials.drivers.length > 0 && (
            <div className="mb-3">
              <h6 className="text-xs text-neutral uppercase tracking-wider mb-2">
                Key Performance Drivers
              </h6>
              <div className="space-y-1.5">
                {financials.drivers.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`${IMPACT_COLORS[d.impact]} text-[10px] mt-0.5`}>
                      {IMPACT_ICONS[d.impact]}
                    </span>
                    <div>
                      <span className="text-white font-medium">{d.factor}: </span>
                      <span className="text-neutral">{d.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key metrics row */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {financials.trailingPE != null && (
              <div className="bg-dark-600 rounded px-2 py-1.5">
                <p className="text-[10px] text-neutral uppercase">P/E</p>
                <p className="text-xs text-white font-semibold">{financials.trailingPE.toFixed(1)}x</p>
              </div>
            )}
            {financials.beta != null && (
              <div className="bg-dark-600 rounded px-2 py-1.5">
                <p className="text-[10px] text-neutral uppercase">Beta</p>
                <p className="text-xs text-white font-semibold">{financials.beta.toFixed(2)}</p>
              </div>
            )}
            {financials.marketCap != null && (
              <div className="bg-dark-600 rounded px-2 py-1.5">
                <p className="text-[10px] text-neutral uppercase">Mkt Cap</p>
                <p className="text-xs text-white font-semibold">
                  {(financials.marketCap / 1e9).toFixed(1)}B
                </p>
              </div>
            )}
            {financials.currentPrice != null && (
              <div className="bg-dark-600 rounded px-2 py-1.5">
                <p className="text-[10px] text-neutral uppercase">Price</p>
                <p className="text-xs text-white font-semibold">
                  {financials.currency} {financials.currentPrice.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* DCF Download link */}
          <button
            onClick={handleDCFDownload}
            disabled={dcfLoading || financials.incomeStatements.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-light transition-colors disabled:text-neutral disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {dcfLoading ? 'Generating...' : 'Download 5-Year DCF Model (.xlsx)'}
          </button>
          {financials.incomeStatements.length === 0 && (
            <p className="text-[10px] text-neutral mt-1">Financial statements not available for this stock.</p>
          )}
        </>
      )}
    </div>
  )
}

export default function ThemeDetailPanel({ theme, onClose }) {
  if (!theme) return null

  const isPositive = theme.totalReturn >= 0
  const holdingData = theme.holdingReturns || []
  const chartHeight = Math.max(300, holdingData.length * 28)
  const [selectedStock, setSelectedStock] = useState(null)

  function handleBarClick(data) {
    if (!data?.payload) return
    const clicked = data.payload
    setSelectedStock(prev => prev?.name === clicked.name ? null : clicked)
  }

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 mt-4 animate-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{theme.name}</h3>
          <p className="text-sm text-neutral mt-1">
            {theme.sector} &middot; {theme.subSector} &middot; {theme.region}
          </p>
          <p className="text-sm text-neutral/70 mt-1">{theme.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-neutral uppercase tracking-wider">Theme Return</p>
            <p className={`text-2xl font-bold ${isPositive ? 'text-gain' : 'text-loss'}`}>
              {isPositive ? '+' : ''}{theme.totalReturn.toFixed(2)}%
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral hover:text-white transition-colors text-xl leading-none p-1"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Aggregate performance line chart */}
      {theme.chartData && theme.chartData.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs text-neutral uppercase tracking-wider mb-3">
            Aggregate Performance
          </h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={theme.chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(d) => {
                    const parts = d.split('-')
                    return `${parts[1]}/${parts[2]}`
                  }}
                  interval="preserveStartEnd"
                  minTickGap={50}
                  axisLine={{ stroke: '#243044' }}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={{ stroke: '#243044' }}
                />
                <Tooltip content={<AggregateTooltip />} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? '#22c55e' : '#ef4444'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: isPositive ? '#22c55e' : '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Constituent bar chart */}
      {holdingData.length > 0 ? (
        <div>
          <h4 className="text-xs text-neutral uppercase tracking-wider mb-1">
            Constituent Performance ({holdingData.length} holdings)
          </h4>
          <p className="text-[10px] text-neutral/60 mb-3">Click a bar to see drivers &amp; download DCF</p>
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={holdingData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={{ stroke: '#243044' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fill: '#e2e8f0', fontSize: 11 }}
                  axisLine={{ stroke: '#243044' }}
                  interval={0}
                />
                <Tooltip content={<HoldingTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <Bar dataKey="returnPct" radius={[0, 4, 4, 0]} barSize={18} style={{ cursor: 'pointer' }} onClick={handleBarClick}>
                  {holdingData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.returnPct >= 0 ? '#22c55e' : '#ef4444'}
                      fillOpacity={selectedStock?.name === entry.name ? 1 : 0.75}
                      stroke={selectedStock?.name === entry.name ? '#fff' : 'none'}
                      strokeWidth={selectedStock?.name === entry.name ? 1.5 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stock detail panel (shown when a bar is clicked) */}
          {selectedStock && (
            <StockDetailPanel
              key={selectedStock.name}
              stock={selectedStock}
              onClose={() => setSelectedStock(null)}
            />
          )}
        </div>
      ) : (
        <div>
          <h4 className="text-xs text-neutral uppercase tracking-wider mb-2">Key Holdings</h4>
          <div className="flex flex-wrap gap-2">
            {theme.holdings.map((holding) => (
              <span
                key={holding}
                className="bg-dark-600 text-sm text-white/80 px-3 py-1 rounded-full"
              >
                {holding}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
