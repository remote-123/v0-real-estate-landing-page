"use client"

import { useState, useMemo } from "react"

// ── Thresholds ────────────────────────────────────────────────────────────────

const GOLDEN_VISA_THRESHOLD = 2_000_000
const INVESTOR_VISA_THRESHOLD = 750_000

type VisaTier = "golden_visa_10yr" | "investor_visa_2yr" | "not_eligible"
type PropertyStatus = "completed" | "off-plan"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAED(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${n.toLocaleString()}`
}

function formatFull(n: number): string {
  return `AED ${new Intl.NumberFormat("en-US").format(Math.round(n))}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GoldenVisaCalculator() {
  const [propertyPrice, setPropertyPrice] = useState(2_000_000)
  const [propertyStatus, setPropertyStatus] = useState<PropertyStatus>("completed")

  const result = useMemo(() => {
    let tier: VisaTier
    if (propertyPrice >= GOLDEN_VISA_THRESHOLD) {
      tier = "golden_visa_10yr"
    } else if (propertyPrice >= INVESTOR_VISA_THRESHOLD) {
      tier = "investor_visa_2yr"
    } else {
      tier = "not_eligible"
    }

    const shortfallToInvestor =
      tier === "not_eligible" ? INVESTOR_VISA_THRESHOLD - propertyPrice : 0
    const shortfallToGolden =
      tier === "investor_visa_2yr" ? GOLDEN_VISA_THRESHOLD - propertyPrice : 0
    const surplusAboveGolden =
      tier === "golden_visa_10yr" ? propertyPrice - GOLDEN_VISA_THRESHOLD : 0

    return {
      tier,
      shortfallToInvestor,
      shortfallToGolden,
      surplusAboveGolden,
      showOffPlanAdvisory: propertyStatus === "off-plan" && tier === "golden_visa_10yr",
    }
  }, [propertyPrice, propertyStatus])

  const inputClass =
    "w-full rounded-md border border-border/50 bg-background/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"

  const tierConfig = {
    golden_visa_10yr: {
      label: "10-Year Golden Visa Eligible",
      sublabel: "Property meets AED 2,000,000 Golden Visa threshold",
      badgeClass: "bg-amber-500/15 border-amber-500/40 text-amber-400",
      dotClass: "bg-amber-400",
    },
    investor_visa_2yr: {
      label: "2-Year Investor Visa Eligible",
      sublabel: "Property meets AED 750,000 Investor Visa threshold",
      badgeClass: "bg-blue-500/15 border-blue-500/40 text-blue-400",
      dotClass: "bg-blue-400",
    },
    not_eligible: {
      label: "Below Minimum Visa Threshold",
      sublabel: `Below AED 750,000 minimum for Investor Visa`,
      badgeClass: "bg-red-500/10 border-red-500/30 text-red-400",
      dotClass: "bg-red-400",
    },
  }[result.tier]

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Property Details
        </h2>

        <div className="space-y-4">
          {/* Purchase price */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Property Purchase Price (AED)
            </label>
            <input
              type="number"
              min={100_000}
              max={200_000_000}
              step={50_000}
              value={propertyPrice}
              onChange={(e) => setPropertyPrice(Number(e.target.value))}
              className={inputClass}
            />
            <p className="font-mono text-[10px] text-muted-foreground/60">
              {formatAED(propertyPrice)}
            </p>
          </div>

          {/* Property status */}
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Property Status
            </p>
            <div className="flex gap-3">
              {(["Completed", "Off-Plan"] as const).map((label) => {
                const val = label === "Off-Plan" ? "off-plan" : "completed"
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPropertyStatus(val as PropertyStatus)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      propertyStatus === val
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground border-border/50 hover:border-border"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {propertyStatus === "off-plan" && (
              <p className="font-mono text-[10px] text-muted-foreground/60">
                Off-plan: only equity paid (not financed) counts toward threshold
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Result badge */}
      <div
        className={`rounded-xl border p-5 flex items-start gap-4 ${tierConfig.badgeClass}`}
      >
        <span className={`mt-1 w-3 h-3 rounded-full shrink-0 ${tierConfig.dotClass}`} />
        <div>
          <p className="font-semibold text-base">{tierConfig.label}</p>
          <p className="text-sm opacity-80 mt-0.5">{tierConfig.sublabel}</p>
        </div>
      </div>

      {/* Off-plan advisory */}
      {result.showOffPlanAdvisory && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-wider text-amber-500/80">
            Off-Plan Advisory
          </p>
          <p className="text-sm text-amber-300/90 leading-relaxed">
            Off-plan properties require the developer to be on the ICP-approved list and only the
            paid equity (not the mortgaged portion) counts toward the AED 2M threshold. Confirm
            eligibility with ICP or a UAE immigration specialist before relying on this calculation.
          </p>
        </div>
      )}

      {/* Key figures */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Visa Threshold Analysis
        </h2>

        <div className="space-y-0 divide-y divide-border/20">
          {/* Purchase price */}
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm text-muted-foreground">Property Price</span>
            <span className="font-mono text-sm font-semibold">{formatFull(propertyPrice)}</span>
          </div>

          {/* 10-yr Golden Visa threshold */}
          <div className="flex justify-between items-center py-2.5">
            <div>
              <span className="text-sm">10-Year Golden Visa Threshold</span>
              <span className="ml-2 font-mono text-[10px] text-amber-500/80 uppercase tracking-wider">
                ICP / GDRFA
              </span>
            </div>
            <span className="font-mono text-sm text-amber-400">
              {formatFull(GOLDEN_VISA_THRESHOLD)}
            </span>
          </div>

          {/* 2-yr Investor Visa threshold */}
          <div className="flex justify-between items-center py-2.5">
            <div>
              <span className="text-sm">2-Year Investor Visa Threshold</span>
              <span className="ml-2 font-mono text-[10px] text-blue-400/80 uppercase tracking-wider">
                ICP / GDRFA
              </span>
            </div>
            <span className="font-mono text-sm text-blue-400">
              {formatFull(INVESTOR_VISA_THRESHOLD)}
            </span>
          </div>

          {/* Surplus/shortfall row */}
          {result.tier === "golden_visa_10yr" && (
            <div className="flex justify-between items-center py-2.5">
              <span className="text-sm text-muted-foreground">Surplus above Golden Visa threshold</span>
              <span className="font-mono text-sm text-accent">
                +{formatFull(result.surplusAboveGolden)}
              </span>
            </div>
          )}

          {result.tier === "investor_visa_2yr" && (
            <>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm text-muted-foreground">Surplus above Investor Visa threshold</span>
                <span className="font-mono text-sm text-blue-400">
                  +{formatFull(propertyPrice - INVESTOR_VISA_THRESHOLD)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm text-muted-foreground">Still needed for Golden Visa upgrade</span>
                <span className="font-mono text-sm text-amber-400">
                  {formatFull(result.shortfallToGolden)} more
                </span>
              </div>
            </>
          )}

          {result.tier === "not_eligible" && (
            <div className="flex justify-between items-center py-2.5">
              <span className="text-sm text-muted-foreground">Shortfall to Investor Visa threshold</span>
              <span className="font-mono text-sm text-red-400">
                {formatFull(result.shortfallToInvestor)} more needed
              </span>
            </div>
          )}
        </div>

        {/* Upgrade nudge */}
        {result.tier === "investor_visa_2yr" && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] text-amber-400/90">
              {formatFull(result.shortfallToGolden)} more unlocks the 10-Year Golden Visa
            </p>
            <span className="font-mono text-[10px] text-muted-foreground shrink-0">
              AED {(2_000_000).toLocaleString()} threshold
            </span>
          </div>
        )}

        {/* Minimum qualifying price for not eligible */}
        {result.tier === "not_eligible" && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
            <p className="font-mono text-[11px] text-blue-400/90">
              Minimum qualifying price: {formatFull(INVESTOR_VISA_THRESHOLD)} for 2-year Investor Visa
            </p>
          </div>
        )}

        <p className="font-mono text-[10px] text-muted-foreground/40 px-1">
          Thresholds set by UAE ICP/GDRFA. For off-plan properties, only paid equity counts.
          Mortgaged amounts are generally excluded. Verify eligibility with ICP or a UAE
          immigration specialist before purchase.
        </p>
      </div>
    </div>
  )
}
