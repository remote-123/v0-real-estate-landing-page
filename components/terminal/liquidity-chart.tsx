"use client"

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

export type LiquidityPoint = {
  label: string
  mortgages: number
  sales: number
  ratio: number // mortgage / sales * 100
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "11px",
  color: "hsl(var(--foreground))",
}
const TICK = { fontSize: 9, fill: "currentColor", opacity: 0.6 } as const

export function LiquidityChart({ data }: { data: LiquidityPoint[] }) {
  return (
    <div className="rounded-md border border-border/40 bg-card/40 p-4 space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        Mortgage vs Sales Volume + Leverage Ratio — Last 24 Months
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={TICK} dy={6} />
          <YAxis yAxisId="count" axisLine={false} tickLine={false} tick={TICK} dx={-4} />
          <YAxis
            yAxisId="ratio"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={TICK}
            dx={4}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 'auto']}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val: number, name: string) => {
              if (name === "Leverage Ratio") return [`${Number(val).toFixed(1)}%`, name]
              return [Number(val).toLocaleString(), name]
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
            formatter={(val) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{val}</span>}
          />
          <Bar yAxisId="count" dataKey="mortgages" name="Mortgages" fill="#f59e0b" opacity={0.85} barSize={6} />
          <Bar yAxisId="count" dataKey="sales" name="Sales" fill="var(--accent, #10b981)" opacity={0.6} barSize={6} />
          <Line
            yAxisId="ratio"
            type="monotone"
            dataKey="ratio"
            name="Leverage Ratio"
            stroke="#f97316"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 2"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
