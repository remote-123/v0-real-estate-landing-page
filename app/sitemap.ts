import { MetadataRoute } from 'next'
import { sql } from '@/lib/db'
import { unstable_cache } from 'next/cache'
import { client } from '@/sanity/lib/client'

const BASE = 'https://www.northcapitaldxb.com'

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const fetchDynamicUrls = unstable_cache(
  async () => {
    const [areaRows, topAreas, buildingSlugs] = await Promise.allSettled([
      sql<{ area_name_en: string }[]>`
        SELECT DISTINCT area_name_en
        FROM mv_txn_monthly_unified
        WHERE area_name_en IS NOT NULL
        ORDER BY area_name_en
      `,
      sql<{ area_name_en: string }[]>`
        SELECT area_name_en, SUM(txn_count) AS total
        FROM mv_txn_monthly_unified
        WHERE area_name_en IS NOT NULL AND trans_group_en = 'Sales'
        GROUP BY area_name_en ORDER BY total DESC LIMIT 60
      `,
      sql<{ building_slug: string }[]>`
        SELECT building_slug FROM prop_building_details
        WHERE building_slug IS NOT NULL
      `,
    ])
    return {
      areaRows: areaRows.status === 'fulfilled' ? areaRows.value : [],
      topAreas: topAreas.status === 'fulfilled' ? topAreas.value : [],
      buildingSlugs: buildingSlugs.status === 'fulfilled' ? buildingSlugs.value : [],
    }
  },
  ['sitemap-dynamic-urls'],
  { revalidate: 86400 }
)

const TERMINAL_ROUTES = [
  '/terminal',
  '/terminal/home',
  '/terminal/transaction-pulse',
  '/terminal/communities',
  '/terminal/area-momentum',
  '/terminal/distress-deals',
  '/terminal/off-plan-pipeline',
  '/terminal/floor-plan-pricer',
  '/terminal/building-comparator',
  '/terminal/prop-buildings',
  '/terminal/developer-track',
  '/terminal/calculators',
  '/terminal/price-index',
  '/terminal/supply-pipeline',
  '/terminal/service-charges',
  '/terminal/market-briefing',
  '/terminal/research',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = TERMINAL_ROUTES.map((route) => ({
    url: `${BASE}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: route === '/terminal' ? 1.0 : 0.85,
  }))

  const { areaRows, topAreas, buildingSlugs } = await fetchDynamicUrls()

  const communityUrls: MetadataRoute.Sitemap = areaRows.map((row) => ({
    url: `${BASE}/terminal/communities/${toSlug(row.area_name_en)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.75,
  }))

  const areaDeepDiveUrls: MetadataRoute.Sitemap = topAreas.map((row) => ({
    url: `${BASE}/terminal/areas/${toSlug(row.area_name_en)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.80,
  }))

  const buildingUrls: MetadataRoute.Sitemap = buildingSlugs.map((row) => ({
    url: `${BASE}/terminal/prop-buildings/${row.building_slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.70,
  }))

  // Blog posts from Sanity
  let researchUrls: MetadataRoute.Sitemap = []
  try {
    const posts = await client.fetch<{ slug: string; publishedAt: string | null }[]>(
      `*[_type == "post" && defined(slug.current)]{ "slug": slug.current, publishedAt }`
    )
    researchUrls = posts.map((p) => ({
      url: `${BASE}/terminal/research/${p.slug}`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.80,
    }))
  } catch { /* Sanity unavailable — skip */ }

  return [...staticRoutes, ...communityUrls, ...areaDeepDiveUrls, ...buildingUrls, ...researchUrls]
}
