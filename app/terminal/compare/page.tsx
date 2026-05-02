import type { Metadata } from "next"
import { CompareClient } from "@/components/terminal/compare-client"

export const metadata: Metadata = {
  title: "Area Comparison | North Capital DXB",
  description:
    "Compare two Dubai areas side by side — PSF trend, average price, 12-month high/low, and momentum signals. Powered by live DLD transaction data.",
  alternates: { canonical: "/terminal/compare" },
}

export default function ComparePage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          Analysis
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Area Comparison</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Select two areas to compare PSF trends, momentum, and entry price side by side.
        </p>
      </div>

      <CompareClient />
    </div>
  )
}
