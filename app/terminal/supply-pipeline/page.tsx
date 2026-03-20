import type { Metadata } from "next"
import { sql } from "@/lib/db"
import { Building2, CalendarClock, Layers, MapPin } from "lucide-react"
import { StatCard } from "@/components/terminal/stat-card"
import { SupplyPipelineTable } from "@/components/terminal/supply-pipeline-table"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Off-Plan Supply Pipeline | North Capital DXB",
  description:
    "Track upcoming unit supply by area and developer. DLD-registered projects Under Construction and Not Started across Dubai.",
  alternates: {
    canonical: "https://www.northcapitaldxb.com/terminal/supply-pipeline",
  },
}

export interface Project {
  project_id: string
  project_name_en: string | null
  area_name_en: string | null
  master_project_en: string | null
  developer_name: string | null
  project_status: string | null
  completion_date: string | null
  percent_completed: number | null
  no_of_units: number | null
  no_of_buildings: number | null
}

async function fetchProjects(): Promise<{
  active: Project[]
  completedCount: number
}> {
  try {
    const [active, completedRows] = await Promise.all([
      sql<Project[]>`
        SELECT project_id, project_name_en, area_name_en, master_project_en,
               developer_name, project_status, completion_date, percent_completed,
               no_of_units, no_of_buildings
        FROM dld_projects
        WHERE project_status IN ('ACTIVE', 'NOT_STARTED', 'PENDING', 'CONDITIONAL_ACTIVATING')
        ORDER BY completion_date ASC NULLS LAST
      `,
      sql<[{ count: string }]>`
        SELECT count(*) FROM dld_projects WHERE project_status = 'FINISHED'
      `,
    ])
    return { active, completedCount: Number(completedRows[0]?.count ?? 0) }
  } catch (error) {
    console.error("supply-pipeline fetch error:", error)
    return { active: [], completedCount: 0 }
  }
}

function computeStats(projects: Project[]) {
  const totalUnits = projects.reduce((sum, p) => sum + (p.no_of_units ?? 0), 0)

  const now = new Date()
  const in12m = new Date(now)
  in12m.setMonth(in12m.getMonth() + 12)

  const due12m = projects.filter((p) => {
    if (!p.completion_date) return false
    const d = new Date(p.completion_date)
    return d >= now && d <= in12m
  }).length

  // Top area by pipeline units
  const areaMap: Record<string, number> = {}
  for (const p of projects) {
    const area = p.area_name_en ?? "Unknown"
    areaMap[area] = (areaMap[area] ?? 0) + (p.no_of_units ?? 0)
  }
  const topArea =
    Object.entries(areaMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"

  return { totalUnits, due12m, topArea }
}

export default async function SupplyPipelinePage() {
  const { active, completedCount } = await fetchProjects()
  const { totalUnits, due12m, topArea } = computeStats(active)

  const formatUnits = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString()

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 xl:px-12 py-0 sm:py-6 max-w-[1400px] mx-auto pb-24 lg:pb-12">
      {/* Page header */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Market Data
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Off-Plan Supply Pipeline
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Track upcoming unit supply by area and developer. Sourced from DLD
          registered projects.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Pipeline Units"
          value={formatUnits(totalUnits)}
          icon={Layers}
          description={`Across ${active.length.toLocaleString()} active projects`}
        />
        <StatCard
          label="Active Projects"
          value={active.length.toLocaleString()}
          icon={Building2}
          description={`${completedCount.toLocaleString()} completed`}
        />
        <StatCard
          label="Top Supply Area"
          value={topArea}
          icon={MapPin}
          description="By pipeline unit count"
        />
        <StatCard
          label="Due < 12 Months"
          value={due12m.toLocaleString()}
          icon={CalendarClock}
          description="Projects with scheduled delivery"
        />
      </div>

      {/* Table */}
      <SupplyPipelineTable projects={active} />

      {/* Source note */}
      <p className="text-[10px] text-muted-foreground/50 pb-2">
        Source: Dubai Land Department — 3,039 registered projects
      </p>
    </div>
  )
}
