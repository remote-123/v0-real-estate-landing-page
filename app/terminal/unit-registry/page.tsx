import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { auth } from "@/auth"
import { isTerminalUnlocked } from "@/lib/terminal-gate"
import { Building2 } from "lucide-react"
import { UnitRegistryClient } from "@/components/terminal/unit-registry-client"
import Link from "next/link"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Unit Registry — Dubai DLD Property Database",
    description: "Browse 1.27M+ Dubai Land Department registered units. Filter by project, area, floor, bedrooms, and size. Due diligence tool for investors and agents.",
    path: "/terminal/unit-registry",
  })
}

async function fetchAreaList(): Promise<string[]> {
  try {
    const rows = await sql<{ area_name_en: string }[]>`
      SELECT DISTINCT area_name_en
      FROM dld_units
      WHERE area_name_en IS NOT NULL AND area_name_en != ''
      ORDER BY area_name_en
    `
    return rows.map((r) => r.area_name_en)
  } catch {
    return []
  }
}

export default async function UnitRegistryPage() {
  const [session, areas] = await Promise.all([auth(), fetchAreaList()])
  const isAuthenticated = await isTerminalUnlocked(session)

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Data Terminal
            </p>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-accent" />
              Unit Registry
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse DLD-registered units by project, floor, bedrooms, and size. Freehold status and parking data included.
            </p>
          </div>
          {!isAuthenticated && (
            <span className="shrink-0 self-start text-[11px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded">
              5 results free · unlock all
            </span>
          )}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Registered Units", value: "1.27M+" },
            { label: "Areas Covered", value: "300+" },
            { label: "Floor Data", value: "Included" },
            { label: "Freehold / Leasehold", value: "Flagged" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="border border-border/40 rounded-lg px-4 py-3 bg-card/40"
            >
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {label}
              </p>
              <p className="font-mono text-base font-bold text-foreground mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Search interface */}
        <UnitRegistryClient areas={areas} isAuthenticated={isAuthenticated} />

        {/* Cross-links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {[
            {
              href: "/terminal/transaction-search",
              label: "Comparable Sales",
              desc: "Search DLD sales transactions for the same project",
            },
            {
              href: "/terminal/building-comparator",
              label: "Building Comparator",
              desc: "Head-to-head PSF and service charge trends",
            },
            {
              href: "/terminal/floor-plan-pricer",
              label: "Floor Plan Pricer",
              desc: "P10–P90 price distribution by area and bedrooms",
            },
          ].map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="border border-border/40 rounded-lg px-4 py-3 bg-card/40 hover:bg-card/60 transition-colors group"
            >
              <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                {label} →
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>

        <p className="text-[11px] font-mono text-muted-foreground/40 px-1">
          Source: Dubai Land Department Unit Registry · Static dataset, periodically refreshed
        </p>
      </div>
    </>
  )
}
