'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp } from 'lucide-react'

interface PricePoint {
  month: string
  pricePerSqft: number
}

interface Props {
  priceHistory: PricePoint[]
}

export function CommunityCharts({ priceHistory }: Props) {
  const min = Math.min(...priceHistory.map(d => d.pricePerSqft))
  const max = Math.max(...priceHistory.map(d => d.pricePerSqft))
  const change = ((priceHistory[11].pricePerSqft - priceHistory[0].pricePerSqft) / priceHistory[0].pricePerSqft * 100).toFixed(1)
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

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={priceHistory} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[Math.floor(min * 0.97), Math.ceil(max * 1.03)]}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${(v / 1000).toFixed(1)}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}
            formatter={(value: number) => [`AED ${new Intl.NumberFormat('en-US').format(value)} / sqft`, '']}
          />
          <Line
            type="monotone"
            dataKey="pricePerSqft"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'hsl(var(--accent))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  )
}
