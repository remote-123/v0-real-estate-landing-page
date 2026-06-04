import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { unstable_cache } from 'next/cache'
import { auth } from "@/auth"
import { isTerminalUnlocked } from "@/lib/terminal-gate"
import { Search } from "lucide-react"
import { TransactionSearchClient } from "@/components/terminal/transaction-search-client"
import Link from "next/link"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Comparable Sales Search — DLD Transaction Database",
    description: "Search 1.66M+ Dubai Land Department transactions. Filter by area, building, bedrooms, price, and date range to find comparable sales.",
    path: "/terminal/transaction-search",
  })
}

const fetchAreaList = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const rows = await sql<{ area_name_en: string }[]>`
        SELECT DISTINCT area_name_en
        FROM dld_transactions
        WHERE trans_group_en = 'Sales'
          AND area_name_en IS NOT NULL
          AND area_name_en != ''
        ORDER BY area_name_en
      `
      return rows.map((r) => r.area_name_en)
    } catch {
      return []
    }
  },
  ['txn-search-areas'],
  { revalidate: 86400 }
)

export default async function TransactionSearchPage() {
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
              <Search className="h-6 w-6 text-accent" />
              Comparable Sales Search
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Search DLD registered sales transactions. Filter to find comps for due diligence and appraisals.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {!isAuthenticated && (
              <span className="text-[11px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded">
                5 results free · unlock all
              </span>
            )}
          </div>
        </div>

        {/* Data coverage notice */}
        <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
          <div className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 mt-2" />
          <p className="text-xs font-mono text-muted-foreground">
            DLD data coverage through{" "}
            <span className="text-foreground font-semibold">February 2026</span>.
            {" "}For recent transactions see{" "}
            <Link href="/terminal/transaction-pulse" className="text-accent hover:underline">
              Transaction Pulse
            </Link>{" "}
            (Bayut-sourced, updated daily).
          </p>
        </div>

        {/* Search interface */}
        <TransactionSearchClient areas={areas} isAuthenticated={isAuthenticated} />

        {/* Cross-links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {[
            {
              href: "/terminal/floor-plan-pricer",
              label: "Floor Plan Pricer",
              desc: "P10–P90 percentile pricing by area + beds",
            },
            {
              href: "/terminal/area-momentum",
              label: "Area Momentum",
              desc: "YoY price and volume delta by community",
            },
            {
              href: "/terminal/building-comparator",
              label: "Building Comparator",
              desc: "Head-to-head PSF trend for two buildings",
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
          Source: Dubai Land Department · Sales transactions only · Updated monthly
        </p>
      </div>
    </>
  )
}
