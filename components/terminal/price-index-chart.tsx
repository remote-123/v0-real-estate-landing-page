"use client"

import { useMemo, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

export interface PriceIndexRow {
  period: string
  all_monthly_index: number
  flat_monthly_index: number
  villa_monthly_index: number
  all_monthly_price_index: number
  flat_monthly_price_index: number
  villa_monthly_price_index: number
}

type Range = "1Y" | "3Y" | "5Y" | "All"

interface PriceIndexChartProps {
  data: PriceIndexRow[]
  range: Range
  onRangeChange: (r: Range) => void
}

function formatPeriod(period: string): string {
  const d = new Date(period + "T00:00:00Z")
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" })
}

function cutoffDate(range: Range): Date {
  const now = new Date()
  switch (range) {
    case "1Y": return new Date(now.getFullYear() - 1, now.getMonth(), 1)
    case "3Y": return new Date(now.getFullYear() - 3, now.getMonth(), 1)
    case "5Y": return new Date(now.getFullYear() - 5, now.getMonth(), 1)
    default:   return new Date("2000-01-01")
  }
}

const RANGES: Range[] = ["1Y", "3Y", "5Y", "All"]

export function PriceIndexChart({ data, range, onRangeChange }: PriceIndexChartProps) {
  const filtered = useMemo(() => {
    const cutoff = cutoffDate(range)
    return data
      .filter(row => new Date(row.period + "T00:00:00Z") >= cutoff)
      .map(row => ({
        ...row,
        label: formatPeriod(row.period),
      }))
  }, [data, range])

  // Thin ticks so labels don't overlap
  const tickInterval = filtered.length > 36 ? Math.floor(filtered.length / 18) : filtered.length > 12 ? 2 : 0

  return (
    <div className="rounded-md border border-border/40 bg-card/40 p-4 space-y-4">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Index Performance
        </p>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={
                r === range
                  ? "px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wide bg-accent text-accent-foreground"
                  : "px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={filtered} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval={tickInterval}
            tick={{ fontSize: 9, fill: "currentColor", opacity: 0.6 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fill: "currentColor", opacity: 0.6 }}
            tickFormatter={v => v.toFixed(2)}
            width={44}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "11px",
              color: "hsl(var(--foreground))",
            }}
            formatter={(value: number, name: string) => [
              value.toFixed(3),
              name === "all_monthly_index" ? "All" : name === "flat_monthly_index" ? "Flat" : "Villa",
            ]}
            labelFormatter={label => `Period: ${label}`}
          />
          <Legend
            iconType="plainline"
            iconSize={16}
            wrapperStyle={{ fontSize: "10px", paddingTop: "12px" }}
            formatter={name =>
              name === "all_monthly_index" ? "All Types" : name === "flat_monthly_index" ? "Flats" : "Villas"
            }
          />
          <Line
            type="monotone"
            dataKey="all_monthly_index"
            stroke="hsl(var(--foreground))"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="flat_monthly_index"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="villa_monthly_index"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
