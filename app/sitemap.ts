import { MetadataRoute } from 'next'
import { client } from '@/sanity/lib/client'
import { sql } from '@/lib/db'

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.northcapitaldxb.com'

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
    '/terminal/price-index',
    '/terminal/supply-pipeline',
    '/terminal/service-charges',
    '/terminal/roi-engine',
    '/terminal/off-plan-pipeline',
    '/terminal/market-briefing',
    '/terminal/mortgage-calculator',
    '/terminal/rental-yield',
  ]

  const staticRoutes = [
    '', '/projects', '/blog', '/about', '/contact', '/calculator',
    ...terminalStaticRoutes,
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route.startsWith('/terminal') ? ('hourly' as const) : ('daily' as const),
    priority: route === '' ? 1 : route.startsWith('/terminal') ? 0.85 : 0.9,
  }))

  // 6. Dynamic community pages — one URL per DLD area
  let communityUrls: MetadataRoute.Sitemap = []
  try {
    const areaRows = await sql<{ area_name_en: string }[]>`
      SELECT DISTINCT area_name_en
      FROM mv_txn_monthly
      WHERE area_name_en IS NOT NULL
      ORDER BY area_name_en
    `
    communityUrls = areaRows.map((row) => ({
      url: `${baseUrl}/terminal/communities/${toSlug(row.area_name_en)}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.75,
    }))
  } catch {
    // If DB is unavailable during build, skip community URLs gracefully
  }

  // 7. Dynamic area deep-dive pages — top 20 areas
  let areaDeepDiveUrls: MetadataRoute.Sitemap = []
  try {
    const topAreas = await sql<{ area_name_en: string }[]>`
      SELECT area_name_en, SUM(txn_count) AS total
      FROM mv_txn_monthly
      WHERE area_name_en IS NOT NULL AND trans_group_en = 'Sales'
      GROUP BY area_name_en
      ORDER BY total DESC
      LIMIT 20
    `
    areaDeepDiveUrls = topAreas.map((row) => ({
      url: `${baseUrl}/terminal/areas/${toSlug(row.area_name_en)}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.75,
    }))
  } catch {
    // If DB is unavailable during build, skip
  }

  // 8. Combine everything for Google
  return [...staticRoutes, ...communityUrls, ...areaDeepDiveUrls, ...projectUrls, ...postUrls]
}