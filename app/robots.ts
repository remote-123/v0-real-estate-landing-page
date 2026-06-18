import { MetadataRoute } from 'next'

const BASE_URL = 'https://www.northcapitaldxb.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/terminal/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/sign-in',
          '/studio',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
