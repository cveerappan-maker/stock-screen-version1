import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-white font-semibold text-sm mb-1">{data.name}</p>
      <p className="text-xs text-neutral mb-1">{data.sector} &middot; {data.subSector}</p>
      <p className="text-xs text-neutral mb-2">{data.region}</p>
      <p className={`text-sm font-bold ${data.totalReturn >= 0 ? 'text-gain' : 'text-loss'}`}>
        {data.totalReturn >= 0 ? '+' : ''}{data.totalReturn.toFixed(2)}%
      </p>
    </div>
  )
}

export default function ThemeChart({ data, onThemeClick }) {
  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 30, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#243044' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            tick={{ fill: '#e2e8f0', fontSize: 12 }}
            axisLine={{ stroke: '#243044' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
          <Bar
            dataKey="totalReturn"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={(data) => onThemeClick?.(data)}
          >
            {data.map((entry) => (
              <Cell
                key={entry.id}
                fill={entry.totalReturn >= 0 ? '#22c55e' : '#ef4444'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
