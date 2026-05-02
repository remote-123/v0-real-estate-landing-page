"use client"

import { useState, useMemo } from "react"
import { Calculator, Info } from "lucide-react"

function formatAED(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${n.toLocaleString()}`
}

function formatFull(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n))
}

export function MortgageCalculatorClient() {
  const [propertyPrice, setPropertyPrice] = useState(2_000_000)
  const [downPaymentPct, setDownPaymentPct] = useState(20)
  const [interestRate, setInterestRate] = useState(4.5)
  const [loanTermYears, setLoanTermYears] = useState(25)

  const results = useMemo(() => {
    const loanAmount = propertyPrice * (1 - downPaymentPct / 100)
    const monthlyRate = interestRate / 100 / 12
    const numPayments = loanTermYears * 12

    let monthlyPayment = 0
    if (monthlyRate === 0) {
      monthlyPayment = loanAmount / numPayments
    } else {
      monthlyPayment =
        (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
    }

    const totalCost = monthlyPayment * numPayments
    const totalInterest = totalCost - loanAmount
    const downPaymentAED = propertyPrice * (downPaymentPct / 100)

    return {
      loanAmount,
      monthlyPayment,
      totalInterest,
      totalCost: totalCost + downPaymentAED,
      downPaymentAED,
    }
  }, [propertyPrice, downPaymentPct, interestRate, loanTermYears])

  const inputClass =
    "w-full rounded-md border border-border/50 bg-background/60 px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-accent/50"

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Loan Parameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Property Price */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Property Price (AED)
            </label>
            <input
              type="number"
              min={100_000}
              max={100_000_000}
              step={50_000}
              value={propertyPrice}
              onChange={(e) => setPropertyPrice(Number(e.target.value))}
              className={inputClass}
            />
            <p className="font-mono text-[10px] text-muted-foreground/60">
              {formatAED(propertyPrice)}
            </p>
          </div>

          {/* Down Payment */}
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
              {formatAED(results.downPaymentAED)} cash required
            </p>
          </div>

          {/* Interest Rate */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Interest Rate (% p.a.)
            </label>
            <input
              type="number"
              min={0.5}
              max={15}
              step={0.1}
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className={inputClass}
            />
          </div>

          {/* Loan Term */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Loan Term (Years)
            </label>
            <input
              type="number"
              min={1}
              max={25}
              step={1}
              value={loanTermYears}
              onChange={(e) => setLoanTermYears(Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>

        {/* Dubai rates info note */}
        <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-background/30 p-3">
          <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            <span className="font-semibold text-muted-foreground">Typical Dubai rates:</span>{" "}
            UAE banks typically offer 3.5–5.5% for expats. Minimum 20% down payment required for
            properties under AED 5M. Non-residents may face higher rates and stricter LTV limits.
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Repayment Summary
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Monthly Payment",
              value: `AED ${formatFull(results.monthlyPayment)}`,
              highlight: true,
            },
            {
              label: "Loan Amount",
              value: `AED ${formatFull(results.loanAmount)}`,
              highlight: false,
            },
            {
              label: "Total Interest",
              value: `AED ${formatFull(results.totalInterest)}`,
              highlight: false,
            },
            {
              label: "Total Cost",
              value: `AED ${formatFull(results.totalCost)}`,
              highlight: false,
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-lg border p-4 ${
                item.highlight
                  ? "border-accent/30 bg-accent/5"
                  : "border-border/40 bg-background/30"
              }`}
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                {item.label}
              </p>
              <p
                className={`font-mono text-sm font-bold leading-tight ${
                  item.highlight ? "text-accent" : "text-foreground"
                }`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Interest vs Principal bar */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Principal vs Interest Split
            </p>
            <p className="font-mono text-[10px] text-muted-foreground/60">
              {((results.loanAmount / (results.loanAmount + results.totalInterest)) * 100).toFixed(
                1
              )}
              % principal
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{
                width: `${(results.loanAmount / (results.loanAmount + results.totalInterest)) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-1.5 rounded-sm bg-accent/60" />
              Principal AED {formatFull(results.loanAmount)}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-1.5 rounded-sm bg-muted/60" />
              Interest AED {formatFull(results.totalInterest)}
            </span>
          </div>
        </div>
      </div>

      <p className="font-mono text-[10px] text-muted-foreground/40 px-1">
        Indicative only. Based on standard amortisation formula. Does not include DLD fees (4%),
        agent fees, or maintenance charges. Consult a UAE-licensed mortgage broker for final
        figures.
      </p>
    </div>
  )
}
