"use client"

import { useState, useMemo } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────

type PlanPreset = "20/80" | "40/60" | "60/40" | "30/30/40" | "custom"

interface MilestoneEntry {
  label: string
  date: string
  pct: number
  aed: number
  cumPct: number
  phase: "booking" | "construction" | "handover" | "post-handover"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Reference: Q2 2026 (today)
const REF_YEAR = 2026
const REF_MONTH = 4 // May (0-indexed)

/** Returns "Q{n} {year}" string n months from reference date */
function addMonths(months: number): string {
  const totalMonths = REF_MONTH + Math.max(0, months)
  const year = REF_YEAR + Math.floor(totalMonths / 12)
  const month = totalMonths % 12
  const q = Math.floor(month / 3) + 1
  return `Q${q} ${year}`
}

/** "Construction X% Complete" label for milestone i of total */
function constructionLabel(i: number, total: number): string {
  const pct = Math.round(((i + 1) / (total + 1)) * 100)
  return `Construction ${pct}% Complete`
}

function formatAED(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${n.toLocaleString()}`
}

function formatFull(n: number): string {
  return `AED ${new Intl.NumberFormat("en-US").format(Math.round(n))}`
}

function pctLabel(n: number): string {
  return `${n % 1 === 0 ? n : n.toFixed(1)}%`
}

// ── Plan configs ──────────────────────────────────────────────────────────────

interface PlanConfig {
  milestones: number[]  // construction milestone percentages
  bookingPct: number
  handoverPct: number
  postHandoverPct: number
  postHandoverYears: number
}

const PLAN_CONFIGS: Record<Exclude<PlanPreset, "custom">, PlanConfig> = {
  "20/80": {
    bookingPct: 5,
    milestones: [15],           // 5% + 15% = 20% during, 80% handover
    handoverPct: 80,
    postHandoverPct: 0,
    postHandoverYears: 0,
  },
  "40/60": {
    bookingPct: 10,
    milestones: [10, 10, 10],   // 10% booking + 3×10% = 40% during, 60% handover
    handoverPct: 60,
    postHandoverPct: 0,
    postHandoverYears: 0,
  },
  "60/40": {
    bookingPct: 20,
    milestones: [10, 10, 10, 10], // 20% + 4×10% = 60% during, 40% handover
    handoverPct: 40,
    postHandoverPct: 0,
    postHandoverYears: 0,
  },
  "30/30/40": {
    bookingPct: 10,
    milestones: [10, 10],       // 10% + 2×10% = 30% during, 30% handover, 40% post
    handoverPct: 30,
    postHandoverPct: 40,
    postHandoverYears: 2,
  },
}

// ── Schedule generator ────────────────────────────────────────────────────────

function generateSchedule(
  propertyPrice: number,
  preset: PlanPreset,
  handoverYear: number,
  custom: {
    booking: number
    construction: number
    handover: number
    postHandover: number
    postHandoverYears: number
  }
): MilestoneEntry[] {
  // Months from reference to Q4 of handoverYear
  const handoverMonths = Math.max(3, (handoverYear - REF_YEAR) * 12 + (11 - REF_MONTH))

  let bookingPct: number
  let milestones: number[]
  let handoverPct: number
  let postHandoverPct: number
  let postHandoverYears: number

  if (preset === "custom") {
    bookingPct = custom.booking
    handoverPct = custom.handover
    postHandoverPct = custom.postHandover
    postHandoverYears = custom.postHandoverYears

    const constructionPct = custom.construction
    const numMilestones =
      constructionPct <= 0 ? 0
      : constructionPct <= 10 ? 1
      : constructionPct <= 30 ? 2
      : constructionPct <= 50 ? 3
      : 4
    milestones = numMilestones > 0
      ? Array(numMilestones).fill(constructionPct / numMilestones)
      : []
  } else {
    const c = PLAN_CONFIGS[preset]
    bookingPct = c.bookingPct
    milestones = c.milestones
    handoverPct = c.handoverPct
    postHandoverPct = c.postHandoverPct
    postHandoverYears = c.postHandoverYears
  }

  const entries: MilestoneEntry[] = []
  let cumPct = 0

  // 1. Booking
  cumPct += bookingPct
  entries.push({
    label: "Booking / SPA Signing",
    date: addMonths(0),
    pct: bookingPct,
    aed: propertyPrice * (bookingPct / 100),
    cumPct,
    phase: "booking",
  })

  // 2. Construction milestones
  milestones.forEach((pct, i) => {
    const months = Math.round(((i + 1) / (milestones.length + 1)) * handoverMonths)
    cumPct += pct
    entries.push({
      label: constructionLabel(i, milestones.length),
      date: addMonths(months),
      pct,
      aed: propertyPrice * (pct / 100),
      cumPct,
      phase: "construction",
    })
  })

  // 3. Handover
  cumPct += handoverPct
  entries.push({
    label: "Handover",
    date: addMonths(handoverMonths),
    pct: handoverPct,
    aed: propertyPrice * (handoverPct / 100),
    cumPct,
    phase: "handover",
  })

  // 4. Post-handover (semi-annual instalments)
  if (postHandoverPct > 0 && postHandoverYears > 0) {
    const numInstall = postHandoverYears * 2
    const instPct = postHandoverPct / numInstall
    for (let i = 0; i < numInstall; i++) {
      const months = handoverMonths + (i + 1) * 6
      cumPct += instPct
      entries.push({
        label: `Post-Handover Instalment ${i + 1}/${numInstall}`,
        date: addMonths(months),
        pct: instPct,
        aed: propertyPrice * (instPct / 100),
        cumPct,
        phase: "post-handover",
      })
    }
  }

  return entries
}

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
