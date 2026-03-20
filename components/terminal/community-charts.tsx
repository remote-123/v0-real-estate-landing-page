'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp } from 'lucide-react'

interface PricePoint {
  month: string
  pricePerSqft: number
}

interface Props {
  priceHistory: PricePoint[]
}

const ACCENT = '#10b981' // emerald-500

export function CommunityCharts({ priceHistory }: Props) {
  const min = Math.min(...priceHistory.map(d => d.pricePerSqft))
  const max = Math.max(...priceHistory.map(d => d.pricePerSqft))
  const last = priceHistory[priceHistory.length - 1].pricePerSqft
  const change = ((last - priceHistory[0].pricePerSqft) / priceHistory[0].pricePerSqft * 100).toFixed(1)
  const isPos = Number(change) >= 0

  return (
    <section className="border border-border/50 rounded-xl p-5 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Price / sqft — 12 Month Trend
          </h3>
        </div>
        <span className={`font-mono text-sm font-bold ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPos ? '+' : ''}{change}% YTD
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={priceHistory} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="psf-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={ACCENT} stopOpacity={0.25} />
              <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[Math.floor(min * 0.97), Math.ceil(max * 1.03)]}
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
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
            labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
            formatter={(value: number) => [`AED ${new Intl.NumberFormat('en-US').format(value)} / sqft`, '']}
          />
          <Area
            type="monotone"
            dataKey="pricePerSqft"
            stroke={ACCENT}
            strokeWidth={2}
            fill="url(#psf-fill)"
            dot={false}
            activeDot={{ r: 4, fill: ACCENT, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  )
}
