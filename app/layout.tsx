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
        <MobileStickyBar />
        <ExitIntentPopup />
        <Analytics />
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "vklt96ti3i"); 
          `}
        </Script>
        <GoogleAnalytics gaId="G-1CYNHNZQV0" />
        
        
        </body>
    </html>
  )
}
