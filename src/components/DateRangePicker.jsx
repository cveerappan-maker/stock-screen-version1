import { useState } from 'react'

const PRESET_RANGES = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: 'YTD', days: 'ytd' },
  { label: '1Y', days: 365 },
]

function getDateNDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function getYTDStart() {
  const now = new Date()
  return `${now.getFullYear()}-01-01`
}

export default function DateRangePicker({ startDate, endDate, onRangeChange, minDate, maxDate }) {
  const [activePreset, setActivePreset] = useState('1Y')

  function handlePreset(preset) {
    setActivePreset(preset.label)
    const end = new Date().toISOString().split('T')[0]
    let start
    if (preset.days === 'ytd') {
      start = getYTDStart()
    } else {
      start = getDateNDaysAgo(preset.days)
    }
    onRangeChange(start, end)
  }

  function handleCustomDate(type, value) {
    setActivePreset(null)
    if (type === 'start') {
      onRangeChange(value, endDate)
    } else {
      onRangeChange(startDate, value)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center bg-dark-800 rounded-lg border border-dark-600 p-1 gap-0.5">
        {PRESET_RANGES.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activePreset === preset.label
                ? 'bg-accent text-white shadow-sm'
                : 'text-neutral hover:text-white hover:bg-dark-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <input
          type="date"
          value={startDate}
          min={minDate}
          max={endDate}
          onChange={(e) => handleCustomDate('start', e.target.value)}
          className="bg-dark-800 border border-dark-600 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
        />
        <span className="text-neutral">to</span>
        <input
          type="date"
          value={endDate}
          min={startDate}
          max={maxDate}
          onChange={(e) => handleCustomDate('end', e.target.value)}
          className="bg-dark-800 border border-dark-600 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
        />
      </div>
    </div>
  )
}
