"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export type MonthlyRow = {
  txn_month: string
  trans_group_en: string
  deals: number
  value_bn: number
  avg_psm: number
}

type Props = { data: MonthlyRow[] }

function fmtMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00Z")
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" })
}

// Pivot: one entry per month with Sales/Mortgage/Gifts deal counts + Sales value
function pivot(rows: MonthlyRow[]) {
  const map = new Map<string, { label: string; Sales: number; Mortgages: number; Gifts: number; Cash: number; value_bn: number; mortgage_bn: number; gifts_bn: number }>()
  for (const r of rows) {
    if (!map.has(r.txn_month)) {
      map.set(r.txn_month, { label: fmtMonth(r.txn_month), Sales: 0, Mortgages: 0, Gifts: 0, Cash: 0, value_bn: 0, mortgage_bn: 0, gifts_bn: 0 })
    }
    const entry = map.get(r.txn_month)!
    const key = r.trans_group_en as "Sales" | "Mortgages" | "Gifts"
    entry[key] = Number(r.deals)
    if (r.trans_group_en === "Sales") entry.value_bn = Number(r.value_bn)
    if (r.trans_group_en === "Mortgages") entry.mortgage_bn = Number(r.value_bn)
    if (r.trans_group_en === "Gifts") entry.gifts_bn = Number(r.value_bn)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => ({ ...v, Cash: Math.max(0, v.Sales - v.Mortgages) }))
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "11px",
  color: "hsl(var(--foreground))",
}

const TICK = { fontSize: 9, fill: "currentColor", opacity: 0.6 } as const

export function TransactionPulseChart({ data }: Props) {
  const pivoted = pivot(data)
  const tickInterval = pivoted.length > 18 ? 2 : 0

  return (
    <div className="space-y-4">
      {/* Stacked bar — deal volume */}
      <div className="rounded-md border border-border/40 bg-card/40 p-4 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Monthly Deal Volume — Last 24 Months
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={pivoted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={8} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
              tick={TICK}
              dy={6}
            />
            <YAxis axisLine={false} tickLine={false} tick={TICK} width={40} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "transparent" }} />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
            <Bar dataKey="Sales" stackId="a" fill="var(--accent, #10b981)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Mortgages" stackId="a" fill="#60a5fa" />
            <Bar dataKey="Gifts" stackId="a" fill="#facc15" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line — sales value */}
      <div className="rounded-md border border-border/40 bg-card/40 p-4 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Monthly Transaction Value (AED bn) — Last 24 Months
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={pivoted} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
              tick={TICK}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={TICK}
              width={40}
              tickFormatter={v => `${v}bn`}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "3 3" }}
              formatter={(v: number, name: string) => [`AED ${Number(v).toFixed(2)}bn`, name]}
            />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
            <Line type="monotone" dataKey="value_bn" stroke="var(--accent, #10b981)" strokeWidth={1.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} name="Sales" />
            <Line type="monotone" dataKey="mortgage_bn" stroke="#60a5fa" strokeWidth={1.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} name="Mortgages" />
            <Line type="monotone" dataKey="gifts_bn" stroke="#facc15" strokeWidth={1.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} name="Gifts" />
            <Line type="monotone" dataKey="Cash" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 2" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} name="Cash (est.)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
