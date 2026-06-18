import React from "react"
import type { Metadata } from "next"
import { InvestorSidebar } from "@/components/terminal/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { FeedbackModal } from "@/components/terminal/feedback-modal"
import { MobileNav } from "@/components/terminal/mobile-nav"
import { UserNav } from "@/components/auth/user-nav"
import { HeaderBreadcrumb } from "@/components/terminal/header-breadcrumb"

export const metadata: Metadata = {
    title: 'Dubai Real Estate Intelligence | North Capital',
    description: 'Institutional-grade Dubai property data. Transaction analytics, price indices, yield maps, community screener, and distress deal scanner — powered by DLD and Bayut data.',
    metadataBase: new URL('https://www.northcapitaldxb.com'),
    alternates: { canonical: 'https://www.northcapitaldxb.com/terminal' },
    openGraph: {
        title: 'Dubai Real Estate Intelligence | North Capital',
        description: 'Institutional-grade Dubai property data. Transaction analytics, price indices, yield maps, and distress deal scanner.',
        url: 'https://www.northcapitaldxb.com/terminal',
        siteName: 'North Capital',
        images: [{ url: '/images/terminal-social.png', width: 1200, height: 630, alt: 'North Capital — Dubai Data Platform' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Dubai Real Estate Intelligence | North Capital',
        description: 'Institutional-grade Dubai property data. Powered by DLD and Bayut.',
        images: ['/images/terminal-social.png'],
    },
}

const terminalSchema = {
    "@context": "https://schema.org",
    "@type": "DataCatalog",
    "@id": "https://www.northcapitaldxb.com/terminal#catalog",
    "name": "North Capital — Dubai Real Estate Data Platform",
    "description": "Institutional-grade Dubai property market intelligence. Aggregated from Dubai Land Department (DLD) official transaction registry and Bayut property listings API. Covers 1.66 million+ registered transactions across 2,000+ communities, with daily updates.",
    "url": "https://www.northcapitaldxb.com/terminal",
    "creator": { "@type": "Organization", "name": "North Capital", "url": "https://www.northcapitaldxb.com" },
    "isBasedOn": [
        {
            "@type": "Dataset",
            "name": "Dubai Land Department Transaction Registry",
            "description": "Official registry of all property sales, mortgages, and gifts registered in Dubai",
            "publisher": {
                "@type": "GovernmentOrganization",
                "name": "Dubai Land Department",
                "url": "https://dubailand.gov.ae",
                "sameAs": ["https://dubailand.gov.ae", "https://www.wikidata.org/wiki/Q5310591"],
            },
        },
        {
            "@type": "Dataset",
            "name": "Bayut Property Listings & Transaction Feed",
            "publisher": { "@type": "Organization", "name": "Bayut", "url": "https://www.bayut.com" },
        },
    ],
    "spatialCoverage": {
        "@type": "Place",
        "name": "Dubai, United Arab Emirates",
        "geo": { "@type": "GeoCoordinates", "latitude": "25.2048", "longitude": "55.2708" },
        "address": { "@type": "PostalAddress", "addressLocality": "Dubai", "addressCountry": "AE" },
    },
    "temporalCoverage": "2000-01-01/..",
    "inLanguage": "en",
    "isAccessibleForFree": false,
    "keywords": [
        "Dubai real estate data", "Dubai property analytics", "DLD transaction data",
        "Dubai Land Department analytics", "Dubai community market data", "UAE property intelligence",
        "Dubai rental yield data", "Dubai off-plan pipeline", "Dubai developer track record",
    ],
}

export default async function InvestorTerminalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(terminalSchema) }}
            />
            <InvestorSidebar />
            <main className="lg:pl-64 flex flex-col min-h-screen">
                <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/50 bg-background/95 backdrop-blur-md px-6 lg:px-8">
                    <div className="flex flex-1 items-center justify-between">
                        <div className="flex items-center gap-4">
                            <MobileNav />
                            <HeaderBreadcrumb />
                        </div>
                        <div className="flex items-center gap-3">
                            <FeedbackModal />
                            <UserNav />
                            <ThemeToggle />
                        </div>
                    </div>
                </header>
                <div className="flex-1 py-6 px-0 sm:px-6 lg:p-8">
                    <div className="mx-auto max-w-[1600px]">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
