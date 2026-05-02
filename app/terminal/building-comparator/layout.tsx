import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Building Comparator — Side-by-Side PSF Analysis | North Capital DXB',
  description: 'Compare Dubai buildings side-by-side: price per sqft trends, service charge rates, quarterly transaction volumes, and metro proximity. Data from DLD registered sales.',
  alternates: {
    canonical: '/terminal/building-comparator',
  },
  openGraph: {
    title: 'Building Comparator — Side-by-Side PSF Analysis | North Capital DXB',
    description: 'Compare Dubai buildings side-by-side: price per sqft trends, service charge rates, and quarterly transaction volumes.',
    url: '/terminal/building-comparator',
    images: [{ url: 'https://www.northcapitaldxb.com/images/distress-social.png', width: 1200, height: 630, alt: 'Building Comparator — North Capital DXB' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Building Comparator — Side-by-Side PSF Analysis | North Capital DXB',
    description: 'Compare Dubai buildings side-by-side: price per sqft trends, service charge rates, and quarterly transaction volumes.',
    images: ['https://www.northcapitaldxb.com/images/distress-social.png'],
  },
}

export default function BuildingComparatorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
