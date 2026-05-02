"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export type PSFPoint = {
  label: string
  avg_psf: number
  deals: number
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "11px",
  color: "hsl(var(--foreground))",
}
const TICK = { fontSize: 9, fill: "currentColor", opacity: 0.6 } as const

export function BuildingPSFChart({ data }: { data: PSFPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="rounded-md border border-border/40 bg-card/40 p-4 flex items-center justify-center h-40">
        <p className="text-xs text-muted-foreground font-mono">Insufficient data for chart</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border/40 bg-card/40 p-4 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        AED / sqft — Monthly Average (Last 24 Months)
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="psfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent, #10b981)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent, #10b981)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={TICK} dy={6} />
          <YAxis axisLine={false} tickLine={false} tick={TICK} dx={-4} tickFormatter={(v) => `${v}`} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(val: number, name: string) => {
              if (name === "avg_psf") return [`AED ${Number(val).toLocaleString()} / sqft`, "Avg PSF"]
              return [Number(val).toLocaleString(), "Deals"]
            }}
          />
          <Area
            type="monotone"
            dataKey="avg_psf"
            stroke="var(--accent, #10b981)"
            strokeWidth={1.5}
            fill="url(#psfGradient)"
            dot={false}
            activeDot={{ r: 3, fill: "var(--accent, #10b981)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
