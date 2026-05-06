import { terminalPageMeta, getTerminalSiteInfo } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { Building2, TrendingUp, BarChart3 } from "lucide-react"
import { StatCard } from "@/components/terminal/stat-card"
import { formatAreaName } from "@/lib/area-names"
import { auth } from "@/auth"
import { GatedTableOverlay } from "@/components/auth/gated-table-overlay"
import { isTerminalUnlocked } from "@/lib/terminal-gate"
import { getDeveloperProfile, TYPE_COLORS } from "@/lib/area-data/developer-profiles"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Developer Track Record",
    description: "Dubai developer league table ranked by DLD-registered project pipeline, unit count, and top areas. Data-driven developer due diligence.",
    path: "/terminal/developer-track",
  })
}

interface DeveloperRow {
  developer_name: string
  total_projects: number
  total_units: number
  pipeline_units: number
  active_projects: number
  finished_projects: number
  top_area: string
  avg_completion_pct: number
}

async function fetchDeveloperData(): Promise<{
  developers: DeveloperRow[]
  totalDevelopers: number
  topDeveloper: string
  avgProjectUnits: number
}> {
  try {
    const rows = await sql<DeveloperRow[]>`
      SELECT
        developer_name,
        COUNT(*)::integer                                                                                           AS total_projects,
        COALESCE(SUM(no_of_units), 0)::integer                                                                     AS total_units,
        COALESCE(SUM(CASE WHEN project_status IN ('ACTIVE','NOT_STARTED','PENDING') THEN no_of_units ELSE 0 END), 0)::integer
                                                                                                                   AS pipeline_units,
        COUNT(CASE WHEN project_status IN ('ACTIVE','NOT_STARTED','PENDING') THEN 1 END)::integer                 AS active_projects,
        COUNT(CASE WHEN project_status = 'FINISHED' THEN 1 END)::integer                                          AS finished_projects,
        MODE() WITHIN GROUP (ORDER BY area_name_en)                                                                AS top_area,
        ROUND(AVG(COALESCE(percent_completed, 0))::numeric, 1)                                                    AS avg_completion_pct
      FROM dld_projects
      WHERE developer_name IS NOT NULL
        AND developer_name != ''
        AND no_of_units > 0
      GROUP BY developer_name
      HAVING COUNT(*) >= 2
      ORDER BY total_units DESC
      LIMIT 60
    `

    const totalDevelopers = rows.length
    const topDeveloper = rows[0]?.developer_name ?? "—"
    const avgProjectUnits =
      rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + Number(r.total_units), 0) / rows.length)
        : 0

    return { developers: rows, totalDevelopers, topDeveloper, avgProjectUnits }
  } catch (error) {
    console.error("[developer-track] fetch error:", error)
    return { developers: [], totalDevelopers: 0, topDeveloper: "—", avgProjectUnits: 0 }
  }
}

function pipelineBar(pipeline: number, total: number): string {
  if (total === 0) return "0%"
  return `${Math.round((pipeline / total) * 100)}%`
}

const FREE_ROWS = 5

export default async function DeveloperTrackPage() {
  const [session, { developers, totalDevelopers, topDeveloper, avgProjectUnits }, { siteName, base }] =
    await Promise.all([auth(), fetchDeveloperData(), getTerminalSiteInfo()])
  const isAuthenticated = await isTerminalUnlocked(session)
  const display = isAuthenticated ? developers : developers.slice(0, FREE_ROWS)

  const topDevUnits = developers[0]?.total_units ?? 0

  const developerTrackSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${base}/terminal/developer-track#dataset`,
    "name": "Dubai Developer Track Record — League Table by DLD-Registered Units",
    "description": "Developer performance league table ranked by total Dubai Land Department-registered unit count. Covers pipeline exposure, project completion rates, and primary market areas. Tracks 60+ developers with 2+ registered projects in Dubai's freehold property market.",
    "url": `${base}/terminal/developer-track`,
    "creator": { "@type": "Organization", "name": siteName, "url": base },
    "isBasedOn": {
      "@type": "Dataset",
      "name": "Dubai Land Department Project Registry",
      "description": "Official DLD registry of all developer-submitted real estate projects, including unit counts, completion status, and area classification",
      "publisher": { "@type": "GovernmentOrganization", "name": "Dubai Land Department", "url": "https://dubailand.gov.ae", "sameAs": "https://dubailand.gov.ae" },
    },
    "spatialCoverage": { "@type": "Place", "name": "Dubai, United Arab Emirates", "address": { "@type": "PostalAddress", "addressLocality": "Dubai", "addressCountry": "AE" } },
    "temporalCoverage": "2005-01-01/..",
    "dateModified": new Date().toISOString().slice(0, 10),
    "inLanguage": "en",
    "license": `${base}/terms`,
    "isAccessibleForFree": false,
    "variableMeasured": [
      { "@type": "PropertyValue", "name": "Total Registered Units per Developer", "unitCode": "C62", "measurementTechnique": "SUM(no_of_units) from DLD project registry grouped by developer_name" },
      { "@type": "PropertyValue", "name": "Pipeline Unit Count", "unitCode": "C62" },
      { "@type": "PropertyValue", "name": "Pipeline Exposure Ratio (%)", "unitCode": "P1" },
      { "@type": "PropertyValue", "name": "Project Completion Rate (%)", "unitCode": "P1", "measurementTechnique": "COUNT(FINISHED projects) / COUNT(all projects)" },
      { "@type": "PropertyValue", "name": "Total DLD-Registered Projects", "unitCode": "C62" },
      { "@type": "PropertyValue", "name": "Primary Market Area" },
    ],
    "measurementTechnique": "Aggregated from Dubai Land Department dld_projects registry. Developers with fewer than 2 registered projects are excluded.",
    "keywords": ["Dubai developer track record", "Dubai developer ranking", "Dubai real estate developer data", "DLD developer projects", "Dubai property developer pipeline", "top developers Dubai 2026"],
    "includedInDataCatalog": { "@type": "DataCatalog", "name": `${siteName} — Dubai Real Estate Data Platform`, "url": `${base}/terminal` },
  }

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(developerTrackSchema) }} />
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-8 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Header */}
      <section className="border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          DLD Project Registry
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
          Developer Track Record
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
          Dubai developer league table ranked by total DLD-registered unit count. Pipeline exposure, project completion rate, and top market area per developer.
        </p>
      </section>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-0">
        <StatCard
          label="Developers Tracked"
          value={totalDevelopers.toLocaleString()}
          icon={Building2}
          description="with 2+ registered projects"
        />
        <StatCard
          label="Top Developer"
          value={getDeveloperProfile(topDeveloper)?.brand_name?.split(" ")[0] ?? topDeveloper.split(" ").slice(0, 2).join(" ")}
          icon={TrendingUp}
          description={`${Number(topDevUnits).toLocaleString()} units`}
        />
        <StatCard
          label="Avg Units / Developer"
          value={avgProjectUnits.toLocaleString()}
          icon={BarChart3}
          description="across registered projects"
        />
        <StatCard
          label="Total Ranked"
          value={developers.length.toString()}
          icon={Building2}
          description="developers in table"
        />
      </section>

      {/* Developer Table */}
      <section className="px-4 sm:px-0 space-y-3">
        <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase pb-2 border-b border-border/50 flex items-center justify-between">
          <span>Developer League Table</span>
          <span className="text-xs">Top {developers.length} by total units</span>
        </h3>

        {developers.length === 0 ? (
          <div className="flex items-center justify-center p-12 border border-border/50 rounded-xl bg-card">
            <p className="text-muted-foreground text-sm">No developer data available.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-x-auto rounded-xl border border-border/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground w-8">#</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Developer</th>
                  <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total Units</th>
                  <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Pipeline</th>
                  <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hidden md:table-cell">Projects</th>
                  <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hidden md:table-cell">Finished</th>
                  <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Top Area</th>
                </tr>
              </thead>
              <tbody>
                {display.map((dev, i) => {
                  const pipelinePct = pipelineBar(
                    Number(dev.pipeline_units),
                    Number(dev.total_units)
                  )
                  const finishRate =
                    Number(dev.total_projects) > 0
                      ? Math.round(
                          (Number(dev.finished_projects) / Number(dev.total_projects)) * 100
                        )
                      : 0
                  const profile = getDeveloperProfile(dev.developer_name)

                  return (
                    <tr
                      key={dev.developer_name}
                      className="border-b border-border/30 hover:bg-muted/10 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground text-sm">
                              {profile?.brand_name ?? dev.developer_name}
                            </span>
                            {profile && (
                              <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider ${TYPE_COLORS[profile.type]}`}>
                                {profile.type}
                              </span>
                            )}
                            {profile?.listed && (
                              <span className="inline-flex items-center rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
                                Listed
                              </span>
                            )}
                          </div>
                          {profile && (
                            <span className="text-[10px] text-muted-foreground/60 hidden sm:block">
                              Est. {profile.founded} · {profile.flagship_project}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-bold text-foreground">
                          {Number(dev.total_units).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono hidden sm:table-cell">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-yellow-400 text-xs font-bold">
                            {Number(dev.pipeline_units).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{pipelinePct}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">
                        {Number(dev.total_projects).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span
                          className={`font-mono text-xs ${
                            finishRate >= 50 ? "text-accent" : "text-muted-foreground"
                          }`}
                        >
                          {finishRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                        {dev.top_area ? formatAreaName(dev.top_area) : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
            {!isAuthenticated && developers.length > FREE_ROWS && (
              <GatedTableOverlay
                freeRows={display.length}
                totalRows={developers.length}
                noun="developers"
                callbackUrl="/terminal/developer-track"
              />
            )}
          </div>
        )}
      </section>

      <p className="text-[11px] font-mono text-muted-foreground/40 px-4 sm:px-1">
        Source: Dubai Land Department Project Registry · All registered developers with 2+ projects
      </p>
    </div>
    </>
  )
}
