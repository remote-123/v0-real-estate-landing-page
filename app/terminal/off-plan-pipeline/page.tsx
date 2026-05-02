import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { formatAreaName } from "@/lib/area-names"
import { StatCard } from "@/components/terminal/stat-card"
import { Building2, BarChart3, Map } from "lucide-react"
import { auth } from "@/auth"
import { GatedTableOverlay } from "@/components/auth/gated-table-overlay"
import { isTerminalUnlocked } from "@/lib/terminal-gate"

export const revalidate = 3600

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Off-Plan Pipeline",
    description: "Dubai off-plan development pipeline by area. Track total units under development, active projects, and expected completions across all DLD-registered communities.",
    path: "/terminal/off-plan-pipeline",
  })
}

interface AreaPipeline {
  area_name_en: string
  total_projects: number
  total_units: number
  active_units: number
  completed_units: number
  earliest_completion: string | null
  latest_completion: string | null
}

interface PipelineStats {
  total_off_plan_units: number
  active_projects: number
  areas_with_pipeline: number
  largest_area: string
  largest_area_units: number
}

async function fetchPipelineByArea(): Promise<AreaPipeline[]> {
  try {
    const rows = await sql<{
      area_name_en: string
      total_projects: string
      total_units: string
      active_units: string
      completed_units: string
      earliest_completion: string | null
      latest_completion: string | null
    }[]>`
      SELECT
        area_name_en,
        COUNT(*)::integer                                                                                           AS total_projects,
        COALESCE(SUM(no_of_units), 0)::integer                                                                     AS total_units,
        COALESCE(SUM(CASE WHEN project_status IN ('ACTIVE','NOT_STARTED','PENDING') THEN no_of_units ELSE 0 END), 0)::integer
                                                                                                                   AS active_units,
        COALESCE(SUM(CASE WHEN project_status = 'FINISHED' THEN no_of_units ELSE 0 END), 0)::integer              AS completed_units,
        MIN(CASE WHEN project_status IN ('ACTIVE','NOT_STARTED','PENDING') THEN completion_date END)::text         AS earliest_completion,
        MAX(CASE WHEN project_status IN ('ACTIVE','NOT_STARTED','PENDING') THEN completion_date END)::text         AS latest_completion
      FROM dld_projects
      WHERE area_name_en IS NOT NULL
        AND area_name_en != ''
        AND no_of_units > 0
      GROUP BY area_name_en
      HAVING COALESCE(SUM(CASE WHEN project_status IN ('ACTIVE','NOT_STARTED','PENDING') THEN no_of_units ELSE 0 END), 0) > 0
      ORDER BY active_units DESC
      LIMIT 40
    `
    return rows.map(r => ({
      area_name_en: r.area_name_en,
      total_projects: Number(r.total_projects),
      total_units: Number(r.total_units),
      active_units: Number(r.active_units),
      completed_units: Number(r.completed_units),
      earliest_completion: r.earliest_completion,
      latest_completion: r.latest_completion,
    }))
  } catch {
    return []
  }
}

async function fetchPipelineStats(): Promise<PipelineStats | null> {
  try {
    const rows = await sql<{
      total_off_plan_units: string
      active_projects: string
      areas_with_pipeline: string
      largest_area: string
      largest_area_units: string
    }[]>`
      SELECT
        COALESCE(SUM(CASE WHEN project_status IN ('ACTIVE','NOT_STARTED','PENDING') THEN no_of_units ELSE 0 END), 0)::integer AS total_off_plan_units,
        COUNT(CASE WHEN project_status IN ('ACTIVE','NOT_STARTED','PENDING') THEN 1 END)::integer AS active_projects,
        COUNT(DISTINCT CASE WHEN project_status IN ('ACTIVE','NOT_STARTED','PENDING') THEN area_name_en END)::integer AS areas_with_pipeline,
        (
          SELECT area_name_en FROM dld_projects
          WHERE area_name_en IS NOT NULL AND project_status IN ('ACTIVE','NOT_STARTED','PENDING')
          GROUP BY area_name_en ORDER BY SUM(COALESCE(no_of_units,0)) DESC LIMIT 1
        ) AS largest_area,
        (
          SELECT COALESCE(SUM(no_of_units),0)::integer FROM dld_projects
          WHERE area_name_en IS NOT NULL AND project_status IN ('ACTIVE','NOT_STARTED','PENDING')
          GROUP BY area_name_en ORDER BY SUM(COALESCE(no_of_units,0)) DESC LIMIT 1
        ) AS largest_area_units
      FROM dld_projects
      WHERE no_of_units > 0
    `
    const r = rows[0]
    if (!r) return null
    return {
      total_off_plan_units: Number(r.total_off_plan_units),
      active_projects: Number(r.active_projects),
      areas_with_pipeline: Number(r.areas_with_pipeline),
      largest_area: r.largest_area ?? '',
      largest_area_units: Number(r.largest_area_units),
    }
  } catch {
    return null
  }
}

function formatYear(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).getFullYear().toString()
  } catch {
    return '—'
  }
}

const FREE_ROWS = 5

export default async function OffPlanPipelinePage() {
  const [session, areas, stats] = await Promise.all([
    auth(),
    fetchPipelineByArea(),
    fetchPipelineStats(),
  ])
  const isAuthenticated = await isTerminalUnlocked(session)
  const display = isAuthenticated ? areas : areas.slice(0, FREE_ROWS)

  const totalUnits = stats?.total_off_plan_units ?? 0
  const activeProjects = stats?.active_projects ?? 0
  const areasCount = stats?.areas_with_pipeline ?? 0
  const largestArea = stats ? formatAreaName(stats.largest_area) : '—'
  const largestUnits = stats?.largest_area_units ?? 0

  return (
    <div className="space-y-8 pb-24 lg:pb-10 px-6 sm:px-0">
      <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Intelligence</p>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Off-Plan Pipeline</h1>
        <p className="text-muted-foreground">
          DLD-registered off-plan projects by area — total units, active pipeline, and completion timeline.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Off-Plan Units Tracked"
          value={totalUnits > 0 ? totalUnits.toLocaleString() : '—'}
          icon={Building2}
          description="Active, pending, and not-started projects"
        />
        <StatCard
          label="Active Projects"
          value={activeProjects > 0 ? activeProjects.toLocaleString() : '—'}
          icon={BarChart3}
          description="Projects with units currently in pipeline"
        />
        <StatCard
          label="Areas with Pipeline"
          value={areasCount > 0 ? areasCount.toString() : '—'}
          icon={Map}
          description="DLD areas with active development"
        />
        <StatCard
          label="Largest Pipeline Area"
          value={largestArea}
          icon={Building2}
          description={largestUnits > 0 ? `${largestUnits.toLocaleString()} units active` : 'By active unit count'}
        />
      </div>

      {/* Pipeline table */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
            Pipeline by Area
          </h2>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Sorted by active units</span>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Active = projects with status ACTIVE, NOT_STARTED, or PENDING. Completion years from DLD registration data.
        </p>

        {areas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pipeline data loading from DLD project registry.</p>
        ) : (
          <div className="relative">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="pb-3 text-left font-medium">Area</th>
                    <th className="pb-3 text-right font-medium">Active Units</th>
                    <th className="pb-3 text-right font-medium">Total Units</th>
                    <th className="pb-3 text-right font-medium">Projects</th>
                    <th className="pb-3 text-right font-medium">Earliest Due</th>
                    <th className="pb-3 text-right font-medium">Latest Due</th>
                    <th className="pb-3 text-right font-medium">% Complete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {display.map(area => {
                    const completedPct = area.total_units > 0
                      ? Math.round((area.completed_units / area.total_units) * 100)
                      : 0
                    return (
                      <tr key={area.area_name_en} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-2.5 pr-4 font-medium text-foreground">
                          {formatAreaName(area.area_name_en)}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-accent font-medium">
                          {area.active_units.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">
                          {area.total_units.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">
                          {area.total_projects}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">
                          {formatYear(area.earliest_completion)}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">
                          {formatYear(area.latest_completion)}
                        </td>
                        <td className="py-2.5 pl-2 text-right tabular-nums">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${completedPct}%` }}
                              />
                            </div>
                            <span className="text-muted-foreground text-xs">{completedPct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {!isAuthenticated && areas.length > FREE_ROWS && (
              <GatedTableOverlay
                freeRows={FREE_ROWS}
                totalRows={areas.length}
                noun="pipeline areas"
                callbackUrl="/terminal/off-plan-pipeline"
              />
            )}
          </div>
        )}

        <p className="mt-4 text-[10px] text-muted-foreground/60">
          Source: DLD Projects Registry · {display.length} areas shown · Showing areas with active pipeline only
        </p>
      </div>
    </div>
  )
}
