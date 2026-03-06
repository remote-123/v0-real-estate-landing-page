import { MetadataRoute } from 'next'
import { client } from '@/sanity/lib/client'

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

  // 5. Define static routes
  const staticRoutes = ['', '/projects', '/blog', '/about', '/contact', '/calculator', '/terminal', '/terminal/distress-deals'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route.includes('terminal') ? ('hourly' as const) : ('daily' as const),
    priority: route === '' ? 1 : 0.9,
  }))

  // 6. Combine everything for Google
  return [...staticRoutes, ...projectUrls, ...postUrls]
}