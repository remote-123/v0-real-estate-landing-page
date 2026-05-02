"use client"

import { useState, useMemo } from "react"
import {
  generateSchedule,
  formatAED,
  formatFull,
  pctLabel,
} from "@/lib/tools/calculations"
import type { PlanPreset, MilestoneEntry } from "@/lib/tools/calculations"

// ── Component ─────────────────────────────────────────────────────────────────

const PRESETS: PlanPreset[] = ["20/80", "40/60", "60/40", "30/30/40", "custom"]
const HANDOVER_YEARS = [2025, 2026, 2027, 2028, 2029, 2030]

const PRESET_DESC: Record<Exclude<PlanPreset, "custom">, string> = {
  "20/80": "5% + 15% during build · 80% handover",
  "40/60": "10% + 30% during build · 60% handover",
  "60/40": "20% + 40% during build · 40% handover",
  "30/30/40": "30% during · 30% handover · 40% post",
}

export function OffPlanPaymentCalculator() {
  const [propertyPrice, setPropertyPrice] = useState(1_500_000)
  const [preset, setPreset] = useState<PlanPreset>("40/60")
  const [handoverYear, setHandoverYear] = useState(2027)

  // Custom plan state
  const [customBooking, setCustomBooking] = useState(10)
  const [customConstruction, setCustomConstruction] = useState(40)
  const [customHandover, setCustomHandover] = useState(40)
  const [customPostHandover, setCustomPostHandover] = useState(10)
  const [customPostHandoverYears, setCustomPostHandoverYears] = useState(2)

  const customSum = customBooking + customConstruction + customHandover + customPostHandover
  const customValid = preset !== "custom" || customSum === 100

  const schedule = useMemo(() => {
    if (preset === "custom" && !customValid) return []
    return generateSchedule(propertyPrice, preset, handoverYear, {
      booking: customBooking,
      construction: customConstruction,
      handover: customHandover,
      postHandover: customPostHandover,
      postHandoverYears: customPostHandoverYears,
    })
  }, [propertyPrice, preset, handoverYear, customBooking, customConstruction, customHandover, customPostHandover, customPostHandoverYears, customValid])

  const bookingTotal = schedule.filter((m) => m.phase === "booking").reduce((s, m) => s + m.aed, 0)
  const constructionTotal = schedule.filter((m) => m.phase === "construction").reduce((s, m) => s + m.aed, 0)
  const handoverTotal = schedule.filter((m) => m.phase === "handover").reduce((s, m) => s + m.aed, 0)
  const postHandoverTotal = schedule.filter((m) => m.phase === "post-handover").reduce((s, m) => s + m.aed, 0)
  const hasPostHandover = postHandoverTotal > 0

  const inputClass =
    "w-full rounded-md border border-border/50 bg-background/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Property Details
        </h2>

        <div className="space-y-5">
          {/* Purchase price */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Purchase Price (AED)
            </label>
            <input
              type="number"
              min={500_000}
              max={100_000_000}
              step={50_000}
              value={propertyPrice}
              onChange={(e) => setPropertyPrice(Number(e.target.value))}
              className={inputClass}
            />
            <p className="font-mono text-[10px] text-muted-foreground/60">{formatAED(propertyPrice)}</p>
          </div>

          {/* Payment plan preset */}
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Payment Plan
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    preset === p
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-muted-foreground border-border/50 hover:border-border"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {preset !== "custom" && (
              <p className="font-mono text-[10px] text-muted-foreground/60 pt-0.5">
                {PRESET_DESC[preset]}
              </p>
            )}
          </div>

          {/* Custom plan inputs */}
          {preset === "custom" && (
            <div className="rounded-lg border border-border/40 bg-background/40 p-4 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Custom Percentages
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  ["Booking %", customBooking, setCustomBooking],
                  ["Construction %", customConstruction, setCustomConstruction],
                  ["Handover %", customHandover, setCustomHandover],
                  ["Post-Handover %", customPostHandover, setCustomPostHandover],
                ] as const).map(([label, value, setter]) => (
                  <div key={label} className="space-y-1">
                    <label className="font-mono text-[10px] text-muted-foreground">{label}</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={value}
                      onChange={(e) => (setter as (v: number) => void)(Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p
                  className={`font-mono text-[10px] ${
                    customValid ? "text-accent" : "text-red-400"
                  }`}
                >
                  Sum: {customSum}% {customValid ? "✓" : "— must equal 100%"}
                </p>
                {customPostHandover > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="font-mono text-[10px] text-muted-foreground shrink-0">
                      Post-handover years:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      value={customPostHandoverYears}
                      onChange={(e) => setCustomPostHandoverYears(Number(e.target.value))}
                      className="w-16 rounded-md border border-border/50 bg-background/60 px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Handover year */}
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Expected Handover Year
            </p>
            <div className="flex flex-wrap gap-2">
              {HANDOVER_YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setHandoverYear(y)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    handoverYear === y
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-muted-foreground border-border/50 hover:border-border"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {schedule.length > 0 && (
        <div
          className={`grid gap-3 ${
            hasPostHandover
              ? "grid-cols-2 sm:grid-cols-4"
              : "grid-cols-3"
          }`}
        >
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-amber-500/80">Booking</p>
            <p className="font-mono text-base font-bold text-amber-400">{formatAED(bookingTotal)}</p>
            <p className="font-mono text-[10px] text-muted-foreground/60">Due at SPA</p>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-blue-400/80">Construction</p>
            <p className="font-mono text-base font-bold text-blue-400">{formatAED(constructionTotal)}</p>
            <p className="font-mono text-[10px] text-muted-foreground/60">During build</p>
          </div>
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent/80">Handover</p>
            <p className="font-mono text-base font-bold text-accent">{formatAED(handoverTotal)}</p>
            <p className="font-mono text-[10px] text-muted-foreground/60">On key handover</p>
          </div>
          {hasPostHandover && (
            <div className="rounded-lg border border-border/50 bg-card/40 p-3 space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Post-Handover
              </p>
              <p className="font-mono text-base font-bold text-foreground">
                {formatAED(postHandoverTotal)}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground/60">After keys</p>
            </div>
          )}
        </div>
      )}

      {/* Custom plan invalid warning */}
      {preset === "custom" && !customValid && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm text-red-400 font-mono">
            Custom plan percentages sum to {customSum}% — adjust inputs to 100% to generate schedule.
          </p>
        </div>
      )}

      {/* Payment schedule table */}
      {schedule.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
          <div className="px-5 py-3 border-b border-border/40">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Payment Schedule — {handoverYear} Handover
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Milestone
                  </th>
                  <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Est. Date
                  </th>
                  <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                    % of Price
                  </th>
                  <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Cumulative
                  </th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((m, i) => (
                  <tr
                    key={i}
                    className={`border-b border-border/20 ${
                      m.phase === "handover"
                        ? "bg-accent/5"
                        : m.phase === "booking"
                        ? "bg-amber-500/5"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          m.phase === "handover"
                            ? "font-semibold text-accent"
                            : m.phase === "booking"
                            ? "text-amber-400"
                            : m.phase === "construction"
                            ? "text-blue-400"
                            : "text-muted-foreground"
                        }
                      >
                        {m.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {m.date}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-medium">
                      {formatFull(m.aed)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground hidden sm:table-cell">
                      {pctLabel(m.pct)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">
                      <span className={m.cumPct >= 100 ? "text-accent font-semibold" : "text-muted-foreground"}>
                        {pctLabel(m.cumPct)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/40 bg-card/60">
                  <td className="px-4 py-3 font-semibold text-sm" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold">
                    {formatFull(propertyPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-bold text-muted-foreground hidden sm:table-cell">
                    100%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-bold text-accent">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border/20">
            <p className="font-mono text-[10px] text-muted-foreground/40">
              Dates are estimates based on typical Dubai construction timelines. Actual milestone
              dates are defined in your SPA and tied to construction progress certificates issued by
              the developer. Post-handover instalments typically require post-dated cheques (PDCs) at
              SPA signing.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
