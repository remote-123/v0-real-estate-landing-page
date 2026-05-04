import Link from "next/link"
import { MapPin, TrendingUp, TrendingDown, Minus, ShoppingBag, Building2, GraduationCap, Star } from "lucide-react"
import { sql } from "@/lib/db"
import { getAreaDescription } from "@/lib/area-descriptions"
import { getCommunityAmenities } from "@/lib/community-amenities"

// slug = amenities key + globe scroll target (brand-friendly)
// dldName = exact area_name_en in DB (DLD administrative name)
// dldSlug = toSlug(dldName) — what /terminal/communities/[slug] uses
const COMMUNITIES = [
  { name: "Downtown Dubai",          slug: "downtown-dubai",         dldName: "Burj Khalifa",                           dldSlug: "burj-khalifa" },
  { name: "Dubai Marina",            slug: "dubai-marina",           dldName: "Marsa Dubai",                            dldSlug: "marsa-dubai" },
  { name: "Business Bay",            slug: "business-bay",           dldName: "Business Bay",                           dldSlug: "business-bay" },
  { name: "Palm Jumeirah",           slug: "palm-jumeirah",          dldName: "Palm Jumeirah",                          dldSlug: "palm-jumeirah" },
  { name: "Jumeirah Village Circle", slug: "jumeirah-village-circle",dldName: "Al Barsha South Fourth",                 dldSlug: "al-barsha-south-fourth" },
  { name: "Dubai Hills Estate",      slug: "dubai-hills-estate",     dldName: "Hadaeq Sheikh Mohammed Bin Rashid",      dldSlug: "hadaeq-sheikh-mohammed-bin-rashid" },
  { name: "Arabian Ranches",         slug: "arabian-ranches",        dldName: "Al Hebiah Third",                        dldSlug: "al-hebiah-third" },
  { name: "Damac Hills",             slug: "damac-hills",            dldName: "Al Hebiah Fifth",                        dldSlug: "al-hebiah-fifth" },
  { name: "Al Barsha",               slug: "al-barsha",              dldName: "Al Barsha First",                        dldSlug: "al-barsha-first" },
  { name: "Deira",                   slug: "deira",                  dldName: "Deira",                                  dldSlug: "deira" },
  { name: "Bur Dubai",               slug: "bur-dubai",              dldName: "Bur Dubai",                              dldSlug: "bur-dubai" },
  { name: "Dubai Creek Harbour",     slug: "dubai-creek-harbour",    dldName: "Dubai Creek Harbour",                    dldSlug: "dubai-creek-harbour" },
  { name: "DIFC",                    slug: "difc",                   dldName: "Trade Center First",                     dldSlug: "trade-center-first" },
  { name: "Jumeirah Lake Towers",    slug: "jumeirah-lake-towers",   dldName: "Al Thanyah Fifth",                       dldSlug: "al-thanyah-fifth" },
  { name: "Meydan",                  slug: "meydan",                 dldName: "Nad Al Shiba First",                     dldSlug: "nad-al-shiba-first" },
  { name: "Sobha Hartland",          slug: "sobha-hartland",         dldName: "Sobha Hartland",                         dldSlug: "sobha-hartland" },
]

interface CommunityStats {
  slug: string
  avg_psf: number
  txn_12m: number
  mom_change: number | null
}

async function fetchStats(): Promise<Map<string, CommunityStats>> {
  try {
    const names = COMMUNITIES.map(c => c.dldName)
    const rows = await sql<{
      area_name_en: string
      avg_psf: string
      txn_12m: string
      mom_change: string | null
    }[]>`
      WITH latest AS (
        SELECT MAX(txn_month) AS max_m FROM mv_txn_monthly_unified
      ),
      curr AS (
        SELECT
          area_name_en,
          SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) / 10.764 AS avg_psf,
          SUM(txn_count) AS txn_12m
        FROM mv_txn_monthly_unified, latest
        WHERE txn_month >= max_m - INTERVAL '11 months'
          AND trans_group_en = 'Sales'
          AND property_type_en = 'Unit'
          AND area_name_en = ANY(${names})
        GROUP BY area_name_en
      ),
      prev AS (
        SELECT
          area_name_en,
          SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) / 10.764 AS avg_psf
        FROM mv_txn_monthly_unified, latest
        WHERE txn_month >= max_m - INTERVAL '23 months'
          AND txn_month < max_m - INTERVAL '11 months'
          AND trans_group_en = 'Sales'
          AND property_type_en = 'Unit'
          AND area_name_en = ANY(${names})
        GROUP BY area_name_en
      )
      SELECT
        c.area_name_en,
        ROUND(c.avg_psf::numeric, 0) AS avg_psf,
        c.txn_12m::int AS txn_12m,
        CASE WHEN p.avg_psf > 0 THEN ROUND(((c.avg_psf - p.avg_psf) / p.avg_psf * 100)::numeric, 1) END AS mom_change
      FROM curr c
      LEFT JOIN prev p USING (area_name_en)
    `

    const map = new Map<string, CommunityStats>()
    for (const r of rows) {
      const community = COMMUNITIES.find(c => c.dldName.toLowerCase() === r.area_name_en.toLowerCase())
      if (community) {
        map.set(community.slug, {
          slug: community.slug,
          avg_psf: Number(r.avg_psf),
          txn_12m: Number(r.txn_12m),
          mom_change: r.mom_change != null ? Number(r.mom_change) : null,
        })
      }
    }
    return map
  } catch {
    return new Map()
  }
}

function PsfBadge({ change }: { change: number | null }) {
  if (change == null) return null
  const up = change > 0
  const flat = change === 0
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold ${
      up ? "text-emerald-400" : flat ? "text-muted-foreground" : "text-red-400"
    }`}>
      <Icon className="h-2.5 w-2.5" />
      {up ? "+" : ""}{change.toFixed(1)}% YoY
    </span>
  )
}

export async function CommunityGrid() {
  const statsMap = await fetchStats()

  return (
    <section className="flex flex-col gap-6" aria-label="Dubai Communities">
      {/* Section header */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Dubai · 16 Communities</p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Community Explorer</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Explore Dubai's key residential and commercial communities. Live transaction data, amenities,
          and market trends — updated daily from DLD and Bayut.
        </p>
      </div>

      {/* Grid */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {COMMUNITIES.map(community => {
          const stats = statsMap.get(community.slug)
          const desc = getAreaDescription(community.name)
          const amenities = getCommunityAmenities(community.slug)

          return (
            <article
              key={community.slug}
              id={`community-${community.slug}`}
              className="group rounded-xl border border-border/40 bg-card/40 overflow-hidden hover:border-[#00BFA5]/40 hover:bg-card/60 transition-all duration-200 flex flex-col"
            >
              {/* Card header */}
              <div className="p-4 pb-3 flex flex-col gap-2 flex-1">
                {/* Name + live badge */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-[#00BFA5] transition-colors">
                    {community.name}
                  </h3>
                  <div className="shrink-0 flex items-center gap-1 rounded px-1.5 py-0.5 bg-[#00BFA5]/10">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#00BFA5] animate-pulse" />
                    <span className="text-[8px] font-mono uppercase tracking-widest text-[#00BFA5]">Live</span>
                  </div>
                </div>

                {/* Stats */}
                {stats && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <span className="text-base font-bold font-mono text-foreground">
                        AED {stats.avg_psf.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-muted-foreground ml-1">/ sqft</span>
                    </div>
                    <PsfBadge change={stats.mom_change} />
                    <span className="text-[9px] text-muted-foreground ml-auto">
                      {stats.txn_12m.toLocaleString()} deals/yr
                    </span>
                  </div>
                )}

                {/* Description */}
                {desc && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                    {desc}
                  </p>
                )}

                {/* Highlights */}
                {amenities?.highlights && amenities.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {amenities.highlights.map(h => (
                      <span
                        key={h}
                        className="flex items-center gap-1 rounded-full border border-border/30 bg-background/40 px-2 py-0.5 text-[9px] text-muted-foreground"
                      >
                        <Star className="h-2 w-2 text-[#00BFA5]" />
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Amenities */}
              {amenities && (
                <div className="px-4 pb-3 flex flex-col gap-1.5 border-t border-border/20 pt-3">
                  {amenities.malls.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <ShoppingBag className="h-3 w-3 text-[#00BFA5] mt-0.5 shrink-0" />
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {amenities.malls.slice(0, 2).join(" · ")}
                      </p>
                    </div>
                  )}
                  {amenities.hospitals.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <Building2 className="h-3 w-3 text-[#00BFA5] mt-0.5 shrink-0" />
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {amenities.hospitals.slice(0, 2).join(" · ")}
                      </p>
                    </div>
                  )}
                  {amenities.schools.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <GraduationCap className="h-3 w-3 text-[#00BFA5] mt-0.5 shrink-0" />
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {amenities.schools.slice(0, 2).join(" · ")}
                      </p>
                    </div>
                  )}
                  {amenities.landmarks.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3 w-3 text-[#00BFA5] mt-0.5 shrink-0" />
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {amenities.landmarks.slice(0, 2).join(" · ")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              <div className="px-4 pb-4 pt-2">
                <Link
                  href={`/terminal/communities/${community.dldSlug}`}
                  className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-[#00BFA5]/30 bg-[#00BFA5]/8 py-2 text-[10px] font-mono uppercase tracking-wider text-[#00BFA5] hover:bg-[#00BFA5]/15 hover:border-[#00BFA5]/50 transition-colors"
                >
                  View Market Data →
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
