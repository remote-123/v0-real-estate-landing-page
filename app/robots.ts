import { MetadataRoute } from 'next'
import { headers } from 'next/headers'

const CITY_REGISTRY_HOSTS = ['thecityregistry.com', 'www.thecityregistry.com']

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const isCityRegistry = CITY_REGISTRY_HOSTS.some((h) => host.includes(h))

  const baseUrl = isCityRegistry
    ? 'https://thecityregistry.com'
    : 'https://www.northcapitaldxb.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
