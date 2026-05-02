import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { Building2, Calendar, MapPin, Layers } from "lucide-react"
import { StatCard } from "@/components/terminal/stat-card"
import { ServiceChargesTable } from "@/components/terminal/service-charges-table"
import { auth } from "@/auth"
import { isTerminalUnlocked } from "@/lib/terminal-gate"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Service Charge Intelligence",
    description: "Annual operating costs by project — DLD service charge data for net yield calculation in Dubai real estate.",
    path: "/terminal/service-charges",
  })
}

export interface ServiceChargeRow {
  project_name: string
  master_community_name_en: string
  management_company_name_en: string
  budget_year: number
  total_service_cost: number
}

async function fetchServiceCharges(): Promise<ServiceChargeRow[]> {
  try {
    const rows = await sql<ServiceChargeRow[]>`
      SELECT
        project_name,
        master_community_name_en,
        management_company_name_en,
        budget_year,
        sum(service_cost) AS total_service_cost
      FROM dld_service_charges
      WHERE usage_name_en = 'Residential'
      GROUP BY project_name, master_community_name_en, management_company_name_en, budget_year
      ORDER BY total_service_cost DESC
      LIMIT 2000
    `
    return rows.map(r => ({
      ...r,
      total_service_cost: Number(r.total_service_cost),
    }))
  } catch (error) {
    console.error("Service charges fetch error:", error)
    return []
  }
}

const FREE_ROWS = 5

export default async function ServiceChargesPage() {
  const [session, allRows] = await Promise.all([auth(), fetchServiceCharges()])
  const isAuthenticated = await isTerminalUnlocked(session)
  const rows = isAuthenticated ? allRows : allRows.slice(0, FREE_ROWS)

  // Headline stats
  const uniqueProjects = new Set(allRows.map((r) => r.project_name)).size
  const uniqueCommunities = new Set(
    allRows.map((r) => r.master_community_name_en).filter(Boolean)
  ).size
  const latestYear = allRows.length
    ? Math.max(...allRows.map((r) => r.budget_year))
    : 0

  // Most expensive community by average total service cost
  const communityTotals = new Map<string, { sum: number; count: number }>()
  for (const row of allRows) {
    const c = row.master_community_name_en || "Unknown"
    const existing = communityTotals.get(c) ?? { sum: 0, count: 0 }
    communityTotals.set(c, {
      sum: existing.sum + row.total_service_cost,
      count: existing.count + 1,
    })
  }
  let mostExpensiveCommunity = "—"
  let maxAvg = 0
  for (const [community, { sum, count }] of communityTotals) {
    const avg = sum / count
    if (avg > maxAvg) {
      maxAvg = avg
      mostExpensiveCommunity = community
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-4 sm:px-8 xl:px-12 py-6 max-w-7xl mx-auto pb-24 lg:pb-12">
      {/* Page Header */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Market Data
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Service Charge Intelligence
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Annual operating costs by project — a key input for net yield
          calculation. Source: Dubai Land Department.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Projects Tracked"
          value={uniqueProjects.toLocaleString()}
          icon={Building2}
          description="Unique residential projects with DLD service charge data"
        />
        <StatCard
          label="Communities Covered"
          value={uniqueCommunities.toLocaleString()}
          icon={MapPin}
          description="Master communities represented in the dataset"
        />
        <StatCard
          label="Latest Year"
          value={latestYear ? latestYear.toString() : "—"}
          icon={Calendar}
          description="Most recent budget year in the DLD service charge data"
        />
        <StatCard
          label="Most Expensive Community"
          value={
            mostExpensiveCommunity.length > 18
              ? mostExpensiveCommunity.slice(0, 16) + "…"
              : mostExpensiveCommunity
          }
          icon={Layers}
          description={`Highest avg annual service cost · ${mostExpensiveCommunity}`}
        />
      </div>

      {/* Table */}
      <ServiceChargesTable rows={rows} isAuthenticated={isAuthenticated} totalRows={allRows.length} />

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground/50 leading-relaxed border-t border-border/30 pt-4">
        Source: Dubai Land Department (DLD). Costs shown are total annual
        residential service charges aggregated across all service categories
        (General, Reserved Fund, Adjustment, etc.). Per-sqft estimates require
        unit size data — per-sqft breakdown available once unit registry is
        fully ingested. Data refreshes daily.
      </p>
    </div>
  )
}
