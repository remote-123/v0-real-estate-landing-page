import React from "react"
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { WhatsAppButton } from "@/components/whatsapp-button"
import { MobileStickyBar } from "@/components/mobile-sticky-bar"
import { ExitIntentPopup } from "@/components/exit-intent-popup"
import Script from "next/script"
import { GoogleAnalytics } from '@next/third-parties/google'
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "@/components/auth/session-provider"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { headers } from "next/headers"

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.northcapitaldxb.com'),
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
    images: [
      {
        url: '/images/hero-dubai.jpg',
        width: 1200,
        height: 630,
        alt: 'North Capital DXB',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NorthCapitalDXB | Invest in Dubai Real Estate',
    description: 'Your trusted gateway to UAE property investment. Tax-free returns, booming market, and A-Z personal guidance.',
    images: ['/images/hero-dubai.jpg'],
  },
}

export const viewport: Viewport = {
  themeColor: '#2c1e14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers()
  const site = headersList.get("x-site") ?? "northcapital"
  const isNorthCapital = site === "northcapital"

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${playfair.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <SpeedInsights />
        <SessionProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {isNorthCapital && <WhatsAppButton />}
          {isNorthCapital && <MobileStickyBar />}
          {/* <ExitIntentPopup /> */}
          <Analytics />
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "vklt96ti3i");
            if (typeof window !== 'undefined' && localStorage.getItem('is_internal') === 'true') {
              window.clarity("set", "user_type", "internal");
              window.clarity("consent");
            }
          `}
          </Script>

          {/* 1. The Internal Opt-Out Script */}
          <Script id="ga-opt-out" strategy="beforeInteractive">
            {`
            if (typeof window !== 'undefined' && localStorage.getItem('block_ga') === 'true') {
              window['ga-disable-G-1CYNHNZQV0'] = true;
              console.log('🛑 Internal Traffic: Google Analytics disabled.');
            }
          `}
          </Script>

          <GoogleAnalytics gaId="G-1CYNHNZQV0" />

        </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
