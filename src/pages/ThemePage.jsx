import { useState, useMemo } from 'react'
import DateRangePicker from '../components/DateRangePicker'
import ThemeChart from '../components/ThemeChart'
import ThemeDetailPanel from '../components/ThemeDetailPanel'
import { getThemePerformance, getAvailableDateRange } from '../data/themes'

const SECTOR_FILTERS = [
  'All',
  'Technology',
  'Financials',
  'Industrials',
  'Consumer Discretionary',
  'Materials',
  'Healthcare',
  'Energy',
  'Utilities',
  'Consumer Staples',
]

const REGION_FILTERS = [
  'All',
  'Europe',
  'Japan',
  'India',
  'China',
  'Asia-Pacific',
  'South Korea',
  'Latin America',
  'Southeast Asia',
  'Australia',
  'Middle East',
  'Canada',
  'United Kingdom',
]

export default function ThemePage() {
  const dateRange = getAvailableDateRange()

  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedTheme, setSelectedTheme] = useState(null)
  const [sectorFilter, setSectorFilter] = useState('All')
  const [regionFilter, setRegionFilter] = useState('All')

  const themeData = useMemo(
    () => getThemePerformance(startDate, endDate),
    [startDate, endDate]
  )

  const filteredData = useMemo(() => {
    return themeData.filter((t) => {
      if (sectorFilter !== 'All' && t.sector !== sectorFilter) return false
      if (regionFilter !== 'All' && t.region !== regionFilter) return false
      return true
    })
  }, [themeData, sectorFilter, regionFilter])

  const stats = useMemo(() => {
    if (filteredData.length === 0) return { best: null, worst: null, avg: 0, positive: 0 }
    const sorted = [...filteredData].sort((a, b) => b.totalReturn - a.totalReturn)
    const avg = filteredData.reduce((s, t) => s + t.totalReturn, 0) / filteredData.length
    const positive = filteredData.filter((t) => t.totalReturn > 0).length
    return {
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      avg: Math.round(avg * 100) / 100,
      positive,
    }
  }, [filteredData])

  function handleRangeChange(start, end) {
    setStartDate(start)
    setEndDate(end)
    setSelectedTheme(null)
  }

  function handleThemeClick(theme) {
    setSelectedTheme((prev) => (prev?.id === theme.id ? null : theme))
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Investment Themes</h2>
        <p className="text-sm text-neutral">
          Ex-US sectors and sub-sectors ranked by performance. Click a bar to drill down.
        </p>
      </div>

      {/* Date Range Picker */}
      <div className="mb-6">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onRangeChange={handleRangeChange}
          minDate={dateRange.min}
          maxDate={dateRange.max}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral uppercase tracking-wider">Sector</label>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="bg-dark-800 border border-dark-600 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
          >
            {SECTOR_FILTERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral uppercase tracking-wider">Region</label>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-dark-800 border border-dark-600 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
          >
            {REGION_FILTERS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-lg border border-dark-600 p-4">
          <p className="text-xs text-neutral uppercase tracking-wider mb-1">Themes Shown</p>
          <p className="text-xl font-bold text-white">{filteredData.length}</p>
        </div>
        <div className="bg-dark-800 rounded-lg border border-dark-600 p-4">
          <p className="text-xs text-neutral uppercase tracking-wider mb-1">Positive</p>
          <p className="text-xl font-bold text-gain">{stats.positive}</p>
        </div>
        <div className="bg-dark-800 rounded-lg border border-dark-600 p-4">
          <p className="text-xs text-neutral uppercase tracking-wider mb-1">Best Theme</p>
          <p className="text-sm font-semibold text-white truncate">{stats.best?.name || '—'}</p>
          {stats.best && (
            <p className="text-sm font-bold text-gain">+{stats.best.totalReturn.toFixed(2)}%</p>
          )}
        </div>
        <div className="bg-dark-800 rounded-lg border border-dark-600 p-4">
          <p className="text-xs text-neutral uppercase tracking-wider mb-1">Avg Return</p>
          <p className={`text-xl font-bold ${stats.avg >= 0 ? 'text-gain' : 'text-loss'}`}>
            {stats.avg >= 0 ? '+' : ''}{stats.avg.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 mb-4">
        <h3 className="text-sm font-semibold text-white mb-4">
          Theme Performance — {startDate} to {endDate}
        </h3>
        {filteredData.length > 0 ? (
          <ThemeChart data={filteredData} onThemeClick={handleThemeClick} />
        ) : (
          <div className="h-[400px] flex items-center justify-center text-neutral">
            No themes match the selected filters.
          </div>
        )}
      </div>

      {/* Detail Panel */}
      <ThemeDetailPanel
        theme={selectedTheme}
        onClose={() => setSelectedTheme(null)}
      />

      {/* Theme Table */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-600">
              <th className="text-left px-5 py-3 text-xs text-neutral uppercase tracking-wider font-medium">Rank</th>
              <th className="text-left px-5 py-3 text-xs text-neutral uppercase tracking-wider font-medium">Theme</th>
              <th className="text-left px-5 py-3 text-xs text-neutral uppercase tracking-wider font-medium">Sector</th>
              <th className="text-left px-5 py-3 text-xs text-neutral uppercase tracking-wider font-medium">Sub-Sector</th>
              <th className="text-left px-5 py-3 text-xs text-neutral uppercase tracking-wider font-medium">Region</th>
              <th className="text-right px-5 py-3 text-xs text-neutral uppercase tracking-wider font-medium">Return</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((theme, idx) => (
              <tr
                key={theme.id}
                onClick={() => handleThemeClick(theme)}
                className={`border-b border-dark-700 cursor-pointer transition-colors hover:bg-dark-700 ${
                  selectedTheme?.id === theme.id ? 'bg-dark-700' : ''
                }`}
              >
                <td className="px-5 py-3 text-neutral">{idx + 1}</td>
                <td className="px-5 py-3 font-medium text-white">{theme.name}</td>
                <td className="px-5 py-3 text-neutral">{theme.sector}</td>
                <td className="px-5 py-3 text-neutral">{theme.subSector}</td>
                <td className="px-5 py-3 text-neutral">{theme.region}</td>
                <td className={`px-5 py-3 text-right font-semibold ${
                  theme.totalReturn >= 0 ? 'text-gain' : 'text-loss'
                }`}>
                  {theme.totalReturn >= 0 ? '+' : ''}{theme.totalReturn.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
