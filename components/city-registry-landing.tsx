"use client"

import Link from "next/link"
import { ArrowRight, BarChart3, Building2, Map, TrendingUp, Zap } from "lucide-react"
import { EmailCaptureWidget } from "@/components/terminal/email-capture-widget"

const FEATURES = [
  {
    icon: TrendingUp,
    label: "Transaction Pulse",
    description: "Monthly sales, mortgages & gifts by community",
    href: "/terminal/transaction-pulse",
  },
  {
    icon: Map,
    label: "Community Screener",
    description: "Area-level PSF, yield & volume metrics",
    href: "/terminal/communities",
  },
  {
    icon: BarChart3,
    label: "Distress Deals",
    description: "Below-market listings with discount % and days on market",
    href: "/terminal/distress-deals",
  },
  {
    icon: Building2,
    label: "Building Intelligence",
    description: "Per-building PSF trends, service charges, rental comps",
    href: "/terminal/buildings",
  },
  {
    icon: Zap,
    label: "Area Momentum",
    description: "Momentum scores combining price delta and volume delta",
    href: "/terminal/area-momentum",
  },
]

export function CityRegistryLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <span className="font-serif text-xl font-bold tracking-tight">THE CITY REGISTRY</span>
        <Link
          href="/terminal"
          className="text-xs font-medium text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
        >
          Enter Terminal <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center max-w-3xl mx-auto w-full">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-[11px] font-mono text-accent uppercase tracking-widest">
          Dubai · Real Estate Intelligence
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-foreground mb-6 leading-tight">
          Dubai property data.<br />
          <span className="text-accent">Institutional grade.</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
          Transaction analytics, yield maps, distress deal scanner, and community screener — aggregated from DLD and Bayut data, updated daily.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <Link
            href="/terminal"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent text-accent-foreground px-6 py-3 text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            Open Terminal <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://www.northcapitaldxb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 text-muted-foreground px-6 py-3 text-sm font-medium hover:text-foreground hover:border-border transition-colors"
          >
            Investment Enquiries ↗
          </a>
        </div>

        {/* Feature grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-16 text-left">
          {FEATURES.map(({ icon: Icon, label, description, href }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl border border-border/50 bg-card/40 p-4 hover:border-accent/30 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">{label}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </Link>
          ))}
        </div>

        {/* Email capture */}
        <div className="w-full max-w-md rounded-xl border border-border/50 bg-card/40 p-6 text-left">
          <p className="text-sm font-semibold text-foreground mb-1">Weekly market digest</p>
          <p className="text-xs text-muted-foreground mb-4">Top distress deals + market data, every Monday.</p>
          <EmailCaptureWidget source="cityregistry-landing" label="Subscribe for weekly digest" />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} The City Registry. Data sourced from Dubai Land Department & Bayut.</span>
        <a
          href="https://www.northcapitaldxb.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          Investment advisory → North Capital DXB ↗
        </a>
      </footer>
    </div>
  )
}
