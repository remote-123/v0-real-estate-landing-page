/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/investor-terminal',
        destination: '/terminal',
        permanent: true,
      },
      {
        source: '/investor-terminal/:path*',
        destination: '/terminal/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
