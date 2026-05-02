"use client"

import { useState, useMemo } from "react"
import { calcDldFees, formatAED, formatFull } from "@/lib/tools/calculations"

export function DldFeeCalculator() {
  const [purchasePrice, setPurchasePrice] = useState(2_000_000)
  const [isMortgage, setIsMortgage] = useState(false)
  const [downPaymentPct, setDownPaymentPct] = useState(20)
  const [agentCommissionPct, setAgentCommissionPct] = useState(2)
  const [valuationFee, setValuationFee] = useState(3_000)

  const calc = useMemo(
    () => calcDldFees({ purchasePrice, isMortgage, downPaymentPct, agentCommissionPct, valuationFee }),
    [purchasePrice, isMortgage, downPaymentPct, agentCommissionPct, valuationFee]
  )

  const inputClass =
    "w-full rounded-md border border-border/50 bg-background/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Property Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Purchase price */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Purchase Price (AED)
            </label>
            <input
              type="number"
              min={100_000}
              max={200_000_000}
              step={50_000}
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
              className={inputClass}
            />
            <p className="font-mono text-[10px] text-muted-foreground/60">{formatAED(purchasePrice)}</p>
          </div>

          {/* Financing */}
          <div className="space-y-2 sm:col-span-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Purchase Method
            </p>
            <div className="flex gap-3">
              {(["Cash", "Mortgage"] as const).map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setIsMortgage(label === "Mortgage")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    (label === "Mortgage") === isMortgage
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-muted-foreground border-border/50 hover:border-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Down payment (mortgage only) */}
          {isMortgage && (
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Down Payment (%)
              </label>
              <input
                type="number"
                min={20}
                max={100}
                step={1}
                value={downPaymentPct}
                onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                className={inputClass}
              />
              <p className="font-mono text-[10px] text-muted-foreground/60">
                Loan: {formatAED(calc.loanAmount)}
              </p>
            </div>
          )}

          {/* Agent commission */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Agent Commission (%)
            </label>
            <input
              type="number"
              min={0}
              max={5}
              step={0.5}
              value={agentCommissionPct}
              onChange={(e) => setAgentCommissionPct(Number(e.target.value))}
              className={inputClass}
            />
            <p className="font-mono text-[10px] text-muted-foreground/60">
              Standard: 2% · set 0 for direct developer
            </p>
          </div>

          {/* Valuation fee (mortgage only) */}
          {isMortgage && (
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Valuation Fee (AED)
              </label>
              <input
                type="number"
                min={0}
                max={10_000}
                step={500}
                value={valuationFee}
                onChange={(e) => setValuationFee(Number(e.target.value))}
                className={inputClass}
              />
              <p className="font-mono text-[10px] text-muted-foreground/60">
                Lender-required survey · typically AED 2,500–3,500
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Acquisition Cost Breakdown
        </h2>

        {/* Line items */}
        <div className="space-y-0 divide-y divide-border/20">
          {/* Purchase price (base) */}
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm text-muted-foreground">Purchase Price</span>
            <span className="font-mono text-sm font-semibold">{formatFull(purchasePrice)}</span>
          </div>

          {/* DLD transfer fee */}
          <div className="flex justify-between items-center py-2.5">
            <div>
              <span className="text-sm">DLD Transfer Fee</span>
              <span className="ml-2 font-mono text-[10px] text-amber-500/80 uppercase tracking-wider">4%</span>
            </div>
            <span className="font-mono text-sm text-amber-400">{formatFull(calc.dldTransferFee)}</span>
          </div>

          {/* DLD registration fee */}
          <div className="flex justify-between items-center py-2.5">
            <div>
              <span className="text-sm">DLD Registration Fee</span>
              <span className="ml-2 font-mono text-[10px] text-amber-500/80 uppercase tracking-wider">
                {purchasePrice >= 500_000 ? "flat AED 4K" : "flat AED 2K"}
              </span>
            </div>
            <span className="font-mono text-sm text-amber-400">{formatFull(calc.dldRegistrationFee)}</span>
          </div>

          {/* Agent commission */}
          {agentCommissionPct > 0 && (
            <div className="flex justify-between items-center py-2.5">
              <div>
                <span className="text-sm">Agent Commission</span>
                <span className="ml-2 font-mono text-[10px] text-blue-400/80 uppercase tracking-wider">
                  {agentCommissionPct}%
                </span>
              </div>
              <span className="font-mono text-sm text-blue-400">{formatFull(calc.agentCommission)}</span>
            </div>
          )}

          {/* Mortgage registration fee */}
          {isMortgage && calc.mortgageRegFee > 0 && (
            <div className="flex justify-between items-center py-2.5">
              <div>
                <span className="text-sm text-muted-foreground">Mortgage Registration Fee</span>
                <span className="ml-2 font-mono text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                  0.25% of loan
                </span>
              </div>
              <span className="font-mono text-sm text-muted-foreground">{formatFull(calc.mortgageRegFee)}</span>
            </div>
          )}

          {/* Valuation fee */}
          {isMortgage && calc.valFee > 0 && (
            <div className="flex justify-between items-center py-2.5">
              <span className="text-sm text-muted-foreground">Property Valuation Fee</span>
              <span className="font-mono text-sm text-muted-foreground">{formatFull(calc.valFee)}</span>
            </div>
          )}

          {/* Fees subtotal */}
          <div className="flex justify-between items-center py-2.5 border-t border-border/40 mt-1">
            <div>
              <span className="text-sm font-medium">Total Fees</span>
              <span className="ml-2 font-mono text-[10px] text-muted-foreground/60">
                {calc.feesOverPurchasePct.toFixed(1)}% on top of purchase
              </span>
            </div>
            <span className="font-mono text-sm font-semibold text-foreground">
              {formatFull(calc.feesTotal)}
            </span>
          </div>
        </div>

        {/* Total acquisition cost — hero number */}
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex justify-between items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
              Total Acquisition Cost
            </p>
            <p className="text-[10px] text-muted-foreground/50">Purchase price + all fees</p>
          </div>
          <p className="font-mono text-xl font-bold text-accent">
            {formatFull(calc.totalAcquisitionCost)}
          </p>
        </div>

        <p className="font-mono text-[10px] text-muted-foreground/40 px-1">
          Indicative only. DLD fees are mandatory and fixed by law. Agent commission is negotiable.
          Excludes ongoing costs: service charges, community fees, insurance. Consult a UAE-licensed
          real estate agent for a transaction-specific quote.
        </p>
      </div>
    </div>
  )
}
