import type { Metadata } from "next"
import { MortgageCalculatorClient } from "@/components/terminal/mortgage-calculator-client"

export const metadata: Metadata = {
  title: "Mortgage Calculator — Dubai Property Finance | North Capital DXB",
  description:
    "Model your monthly repayments, total interest, and loan costs for Dubai real estate. Defaults based on UAE bank rates for expat buyers.",
  alternates: {
    canonical: "/terminal/mortgage-calculator",
  },
  openGraph: {
    title: "Mortgage Calculator — Dubai Property Finance | North Capital DXB",
    description:
      "Model your monthly repayments, total interest, and loan costs for Dubai real estate.",
    url: "/terminal/mortgage-calculator",
    images: [
      {
        url: "https://www.northcapitaldxb.com/images/distress-social.png",
        width: 1200,
        height: 630,
        alt: "Mortgage Calculator — North Capital DXB",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mortgage Calculator — Dubai Property Finance | North Capital DXB",
    description:
      "Model your monthly repayments, total interest, and loan costs for Dubai real estate.",
    images: ["https://www.northcapitaldxb.com/images/distress-social.png"],
  },
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
