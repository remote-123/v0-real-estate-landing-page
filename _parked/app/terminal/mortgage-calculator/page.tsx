import { terminalPageMeta } from "@/lib/terminal-metadata"
import { MortgageCalculatorClient } from "@/components/terminal/mortgage-calculator-client"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Mortgage Calculator — Dubai Property Finance",
    description: "Model your monthly repayments, total interest, and loan costs for Dubai real estate. Defaults based on UAE bank rates for expat buyers.",
    path: "/terminal/mortgage-calculator",
  })
}

export default function MortgageCalculatorPage() {
  return (
    <div className="flex w-full flex-col px-4 sm:px-8 xl:px-12 py-6 space-y-6 max-w-4xl mx-auto pb-24 lg:pb-12">
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Tools
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
          Mortgage Calculator
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg">
          Estimate monthly repayments, total interest, and total cost of ownership for a Dubai
          property purchase. All calculations are client-side.
        </p>
      </div>

      <MortgageCalculatorClient />
    </div>
  )
}
