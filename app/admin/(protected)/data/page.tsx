import type { Metadata } from "next"
import { sql } from "@/lib/db"
import { Database, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react"
import { DldImportForm } from "@/components/admin/dld-import-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "DLD Data Import — Admin",
  robots: { index: false, follow: false },
}

async function fetchFreshness() {
  try {
    const [row] = await sql<{ last_date: string | null; total: string }[]>`
      SELECT MAX(instance_date)::text AS last_date, COUNT(*)::text AS total
      FROM dld_transactions
    `
    return { last_date: row?.last_date ?? null, total: Number(row?.total ?? 0) }
  } catch { return { last_date: null, total: 0 } }
}

function addDay(dateStr: string): string {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

export default async function DataImportPage() {
  const { last_date, total } = await fetchFreshness()
  const today = todayUtc()
  const staleDays = last_date ? daysBetween(last_date, today) : null
  const downloadFrom = last_date ? addDay(last_date) : null
  const downloadTo = today

  const status =
    staleDays === null ? "unknown"
    : staleDays <= 7 ? "ok"
    : staleDays <= 30 ? "warn"
    : "error"

  const statusColor = {
    ok: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    warn: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
    error: "text-red-400 border-red-400/30 bg-red-400/10",
    unknown: "text-muted-foreground border-border/40 bg-muted/20",
  }[status]

  const statusIcon = status === "ok"
    ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
    : <AlertTriangle className="h-5 w-5 text-yellow-400" />

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Data Management</p>
        <h1 className="font-serif text-3xl font-bold text-foreground mt-1">DLD Transactions Import</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manually ingest incremental DLD transactions CSV from Dubai Pulse.
        </p>
      </div>

      {/* Freshness card */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Current DB Freshness
          </h2>
          <span className={`ml-auto inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${statusColor}`}>
            {statusIcon}
            {staleDays === null ? "Unknown" : staleDays === 0 ? "Up to date" : `${staleDays} days stale`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-background border border-border/50 p-3">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Total Rows</p>
            <p className="font-mono text-base font-bold text-foreground">{total.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-background border border-border/50 p-3">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Last Transaction Date</p>
            <p className="font-mono text-base font-bold text-foreground">{last_date ?? "—"}</p>
          </div>
          <div className="rounded-lg bg-background border border-border/50 p-3">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Today</p>
            <p className="font-mono text-base font-bold text-foreground">{today}</p>
          </div>
        </div>

        {/* Download guidance */}
        {downloadFrom && staleDays !== null && staleDays > 0 && (
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent/70 font-semibold mb-2">
              Download Range from Dubai Pulse
            </p>
            <div className="flex items-center gap-3">
              <div className="rounded border border-border/50 bg-background px-3 py-2 font-mono text-sm font-bold text-foreground">
                {downloadFrom}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="rounded border border-border/50 bg-background px-3 py-2 font-mono text-sm font-bold text-foreground">
                {downloadTo}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Go to Dubai Pulse → DLD Transactions → filter by date range above → export CSV
            </p>
          </div>
        )}

        {staleDays === 0 && (
          <p className="text-sm text-emerald-400 font-mono">Data is current — no import needed.</p>
        )}
      </div>

      {/* Upload */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-6 space-y-4">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Import CSV
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Upload the CSV downloaded from Dubai Pulse. Rows are upserted by transaction ID —
            safe to re-import overlapping dates. After upload, both materialized views refresh automatically.
          </p>
        </div>
        <DldImportForm />
      </div>

      {/* Format reference */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-6 space-y-2">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          Expected CSV Columns
        </h2>
        <p className="text-xs font-mono text-muted-foreground/80 leading-relaxed break-all">
          TRANSACTION_NUMBER · INSTANCE_DATE · GROUP_EN · PROCEDURE_EN · IS_OFFPLAN_EN ·
          IS_FREE_HOLD_EN · USAGE_EN · AREA_EN · PROP_TYPE_EN · PROP_SB_TYPE_EN ·
          TRANS_VALUE · PROCEDURE_AREA · ACTUAL_AREA · ROOMS_EN · PARKING ·
          NEAREST_METRO_EN · NEAREST_MALL_EN · NEAREST_LANDMARK_EN ·
          TOTAL_BUYER · TOTAL_SELLER · MASTER_PROJECT_EN · PROJECT_EN
        </p>
      </div>
    </div>
  )
}
