import { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { client } from '@/sanity/lib/client'
import { sql } from '@/lib/db'
import { unstable_cache } from 'next/cache'

const fetchCityRegistryAreas = unstable_cache(
  async () => {
    const [areaRows, topAreas] = await Promise.all([
      sql<{ area_name_en: string }[]>`
        SELECT DISTINCT area_name_en FROM mv_txn_monthly
        WHERE area_name_en IS NOT NULL ORDER BY area_name_en
      `,
      sql<{ area_name_en: string }[]>`
        SELECT area_name_en, SUM(txn_count) AS total
        FROM mv_txn_monthly
        WHERE area_name_en IS NOT NULL AND trans_group_en = 'Sales'
        GROUP BY area_name_en ORDER BY total DESC LIMIT 60
      `,
    ])
    return { areaRows, topAreas }
  },
  ['sitemap-cityregistry-areas'],
  { revalidate: 86400 }
)

const fetchMainSiteAreas = unstable_cache(
  async () => {
    const [areaRows, topAreas] = await Promise.all([
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
        GROUP BY area_name_en
        ORDER BY total DESC
        LIMIT 60
      `,
    ])
    return { areaRows, topAreas }
  },
  ['sitemap-main-areas'],
  { revalidate: 86400 }
)

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const CITY_REGISTRY_HOSTS = ['thecityregistry.com', 'www.thecityregistry.com']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const isCityRegistry = CITY_REGISTRY_HOSTS.some((h) => host.includes(h))
  const baseUrl = isCityRegistry ? 'https://thecityregistry.com' : 'https://www.northcapitaldxb.com'

  // cityregistry.com only indexes terminal pages — no agency/blog/project content
  if (isCityRegistry) {
    const terminalRoutes = [
      '/terminal',
      '/terminal/transaction-pulse',
      '/terminal/communities',
      '/terminal/area-momentum',
      '/terminal/yield-map',
      '/terminal/floor-plan-pricer',
      '/terminal/building-comparator',
      '/terminal/distress-deals',
      '/terminal/rental-drops',
      '/terminal/liquidity',
      '/terminal/buildings',
      '/terminal/price-index',
      '/terminal/supply-pipeline',
      '/terminal/service-charges',
      '/terminal/roi-engine',
      '/terminal/mortgage-calculator',
      '/terminal/rental-yield',
      '/tools/rental-yield-calculator',
      '/tools/service-charge-estimator',
      '/tools/mortgage-calculator',
      '/tools/dld-transfer-fee-calculator',
      '/tools/off-plan-payment-calculator',
      '/tools/golden-visa-calculator',
      '/tools',
    ].map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: route === '/terminal' ? 1.0 : 0.85,
    }))

    let communityUrls: MetadataRoute.Sitemap = []
    let areaDeepDiveUrls: MetadataRoute.Sitemap = []
    try {
      const { areaRows, topAreas } = await fetchCityRegistryAreas()
      communityUrls = areaRows.map((row) => ({
        url: `${baseUrl}/terminal/communities/${toSlug(row.area_name_en)}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.75,
      }))
      areaDeepDiveUrls = topAreas.map((row) => ({
        url: `${baseUrl}/terminal/areas/${toSlug(row.area_name_en)}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.80,
      }))
    } catch { /* skip if DB unavailable */ }

    return [...terminalRoutes, ...communityUrls, ...areaDeepDiveUrls]
  }

  // 1. Fetch live projects directly from Sanity
  const projects = await client.fetch(`*[_type == "project" && defined(slug.current)]{
    "slug": slug.current,
    _updatedAt
  }`)

  // 2. Fetch live blog posts directly from Sanity
  const posts = await client.fetch(`*[_type == "post" && defined(slug.current)]{
    "slug": slug.current,
    _updatedAt
  }`)

  // 3. Map the project URLs
  const projectUrls = projects.map((project: any) => ({
    url: `${baseUrl}/projects/${project.slug}`,
    lastModified: new Date(project._updatedAt || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // 4. Map the blog post URLs
  const postUrls = posts.map((post: any) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post._updatedAt || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // 5. Define static routes — all terminal pages included
  const terminalStaticRoutes = [
    '/terminal',
    '/terminal/distress-deals',
    '/terminal/communities',
    '/terminal/transaction-pulse',
    '/terminal/area-momentum',
    '/terminal/floor-plan-pricer',
    '/terminal/yield-map',
    '/terminal/building-comparator',
    '/terminal/developer-track',
    '/terminal/liquidity',
    '/terminal/price-index',
    '/terminal/supply-pipeline',
    '/terminal/service-charges',
    '/terminal/roi-engine',
    '/terminal/off-plan-pipeline',
    '/terminal/compare',
    '/terminal/market-briefing',
    '/terminal/mortgage-calculator',
    '/terminal/rental-yield',
    '/terminal/market-briefing/archive',
    '/terminal/bear-cases',
    '/terminal/bull-cases',
    '/terminal/market-pulse',
    '/terminal/transaction-search',
    '/terminal/unit-registry',
  ]

  const staticRoutes = [
    '', '/projects', '/blog', '/about', '/contact', '/calculator', '/areas',
    '/tools/rental-yield-calculator',
    '/tools/service-charge-estimator',
    '/tools/mortgage-calculator',
    '/tools/dld-transfer-fee-calculator',
    '/tools/off-plan-payment-calculator',
    '/tools/golden-visa-calculator',
    '/tools',
    ...terminalStaticRoutes,
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : route.startsWith('/terminal') ? 0.85 : 0.9,
  }))

  // 6. Dynamic community + area pages — parallelised, unified view
  let communityUrls: MetadataRoute.Sitemap = []
  let areaDeepDiveUrls: MetadataRoute.Sitemap = []
  let publicAreaUrls: MetadataRoute.Sitemap = []
  try {
    const { areaRows, topAreas } = await fetchMainSiteAreas()
    communityUrls = areaRows.map((row) => ({
      url: `${baseUrl}/terminal/communities/${toSlug(row.area_name_en)}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    }))
    areaDeepDiveUrls = topAreas.map((row) => ({
      url: `${baseUrl}/terminal/areas/${toSlug(row.area_name_en)}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.80,
    }))
    publicAreaUrls = topAreas.map((row) => ({
      url: `${baseUrl}/areas/${toSlug(row.area_name_en)}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.78,
    }))
  } catch {
    // If DB is unavailable during build, skip dynamic URLs gracefully
  }

  // 7. Combine everything for Google
  return [...staticRoutes, ...communityUrls, ...areaDeepDiveUrls, ...publicAreaUrls, ...projectUrls, ...postUrls]
}