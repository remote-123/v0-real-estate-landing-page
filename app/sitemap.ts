import { MetadataRoute } from 'next'
import { client } from '@/sanity/lib/client'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.northcapitaldxb.com'

  // 1. Fetch all live projects from Sanity
  const projects = await client.fetch(`*[_type == "project" && defined(slug.current)]{
    "slug": slug.current,
    _updatedAt
  }`)

  // 2. Fetch all live blog posts from Sanity
  const posts = await client.fetch(`*[_type == "post" && defined(slug.current)]{
    "slug": slug.current,
    _updatedAt
  }`)

  // 3. Create the project URLs
  const projectUrls = projects.map((project: any) => ({
    url: `${baseUrl}/projects/${project.slug}`,
    lastModified: new Date(project._updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // 4. Create the blog post URLs
  const postUrls = posts.map((post: any) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post._updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // 5. Define your static main pages
  const staticRoutes = ['', '/projects', '/blog', '/about', '/contact'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.9,
  }))

  // Combine them all together for Google to crawl!
  return [...staticRoutes, ...projectUrls, ...postUrls]
}