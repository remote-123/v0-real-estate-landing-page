import React from "react"
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { WhatsAppButton } from "@/components/whatsapp-button"

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'NorthCapitalDXB | Invest in Dubai Real Estate',
  description:
    'Your trusted gateway to UAE property investment. Tax-free returns, booming market, and A-Z personal guidance for international investors looking to invest in Dubai real estate.',
  keywords: [
    'invest in Dubai real estate',
    'UAE property investment',
    'Dubai real estate',
    'tax-free investment',
    'Dubai property',
    'UAE investment',
  ],
  openGraph: {
    title: 'NorthCapitalDXB | Invest in Dubai Real Estate',
    description:
      'Your trusted gateway to UAE property investment. Tax-free returns, booming market, and A-Z personal guidance.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#2c1e14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${playfair.variable} font-sans antialiased`}
      >
        {children}
        <WhatsAppButton/>
        <Analytics />
      </body>
    </html>
  )
}
