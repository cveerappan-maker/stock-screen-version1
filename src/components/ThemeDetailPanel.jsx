import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'

function MiniTooltip({ active, payload }) {
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

export default function ThemeDetailPanel({ theme, onClose }) {
  if (!theme) return null

  const isPositive = theme.totalReturn >= 0

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
            <p className="text-xs text-neutral uppercase tracking-wider">Return</p>
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

      {/* Price chart */}
      <div className="h-[220px] mb-5">
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
            <Tooltip content={<MiniTooltip />} />
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

      {/* Holdings */}
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
    </div>
  )
}
