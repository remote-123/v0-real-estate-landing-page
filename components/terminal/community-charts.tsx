'use client'

import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { TrendingUp } from 'lucide-react'

export type MultiPricePoint = {
  month: string
  [key: string]: string | number
}

const FLAT_LINES = [
  { key: 'studio', label: 'Studio', color: '#6366f1' },
  { key: '1br',    label: '1 BR',   color: '#10b981' },
  { key: '2br',    label: '2 BR',   color: '#f59e0b' },
  { key: '3br',    label: '3 BR',   color: '#ef4444' },
  { key: '4br',    label: '4 BR+',  color: '#a855f7' },
]

const VILLA_LINE = { key: 'all', label: 'Villa', color: '#10b981' }

interface Props {
  priceHistory: MultiPricePoint[]
  type: 'flat' | 'villa'
}

export function CommunityCharts({ priceHistory, type }: Props) {
  const lines = type === 'flat' ? FLAT_LINES : [VILLA_LINE]

  // Only render lines that have at least one data point
  const activeLines = lines.filter(l =>
    priceHistory.some(p => p[l.key] != null && Number(p[l.key]) > 0)
  )

  if (priceHistory.length < 2 || activeLines.length === 0) return null

  // Compute % change for first active line as headline stat
  const primary = activeLines[0]
  const vals = priceHistory.map(p => p[primary.key] as number).filter(v => v > 0)
  const change = vals.length >= 2
    ? ((vals[vals.length - 1] - vals[0]) / vals[0] * 100).toFixed(1)
    : '0.0'
  const isPos = Number(change) >= 0

  // Y-axis domain across all active lines
  const allVals = priceHistory.flatMap(p =>
    activeLines.map(l => p[l.key] as number).filter(v => v > 0)
  )
  const minY = Math.floor(Math.min(...allVals) * 0.95)
  const maxY = Math.ceil(Math.max(...allVals) * 1.05)

  const label = type === 'flat' ? 'Flat — Price / sqft by Bedrooms (24M)' : 'Villa — Price / sqft (24M)'

  return (
    <section className="border border-border/50 rounded-xl p-5 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            {label}
          </h3>
        </div>
        <span className={`font-mono text-sm font-bold ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
          {primary.label} {isPos ? '+' : ''}{change}%
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={priceHistory} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[minY, maxY]}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${(v / 1000).toFixed(1)}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
            labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
            formatter={(value: number, name: string) => {
              const line = [...FLAT_LINES, VILLA_LINE].find(l => l.key === name)
              return [`AED ${new Intl.NumberFormat('en-US').format(value)} / sqft`, line?.label ?? name]
            }}
          />
          {activeLines.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '8px' }}
              formatter={(value) => {
                const line = [...FLAT_LINES, VILLA_LINE].find(l => l.key === value)
                return <span style={{ color: '#9ca3af' }}>{line?.label ?? value}</span>
              }}
            />
          )}
          {activeLines.map(l => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              stroke={l.color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: l.color, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  )
}
