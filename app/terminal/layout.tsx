import React from "react"
import type { Metadata } from "next"
import { InvestorSidebar } from "@/components/terminal/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { FeedbackModal } from "@/components/terminal/feedback-modal"
import { MobileNav } from "@/components/terminal/mobile-nav"
import { UserNav } from "@/components/auth/user-nav"
import { headers } from "next/headers"
import { CityRegistryTheme } from "@/components/city-registry-theme"

export async function generateMetadata(): Promise<Metadata> {
    const headersList = await headers()
    const site = headersList.get("x-site") ?? "northcapital"
    const isCityRegistry = site === "cityregistry"

    if (isCityRegistry) {
        return {
            title: 'Dubai Real Estate Intelligence | The City Registry',
            description: 'Institutional-grade Dubai property data. Transaction analytics, price indices, yield maps, community screener, and distress deal scanner — powered by DLD and Bayut data.',
            metadataBase: new URL('https://thecityregistry.com'),
            alternates: { canonical: 'https://thecityregistry.com/terminal' },
            verification: { google: 'mgQDqmDOOITUVlJEizKp0OHxHj44AwCgOX0EPWf9cf4' },
            openGraph: {
                title: 'Dubai Real Estate Intelligence | The City Registry',
                description: 'Institutional-grade Dubai property data. Transaction analytics, price indices, yield maps, and distress deal scanner.',
                url: 'https://thecityregistry.com/terminal',
                siteName: 'The City Registry',
                images: [{ url: '/images/terminal-social.png', width: 1200, height: 630, alt: 'The City Registry — Dubai Data Platform' }],
            },
            twitter: {
                card: 'summary_large_image',
                title: 'Dubai Real Estate Intelligence | The City Registry',
                description: 'Institutional-grade Dubai property data. Powered by DLD and Bayut.',
                images: ['/images/terminal-social.png'],
            },
        }
    }

    return {
        title: 'Dubai Real Estate Intelligence | The City Registry',
        description: 'Institutional-grade Dubai property data. Transaction analytics, yield maps, community screener, and distress deal scanner.',
        metadataBase: new URL('https://thecityregistry.com'),
        openGraph: {
            title: 'Dubai Real Estate Intelligence | The City Registry',
            description: 'Institutional-grade Dubai property data. Transaction analytics, yield maps, community screener, and distress deal scanner.',
            images: [{ url: '/images/terminal-social.png', width: 1200, height: 630, alt: 'The City Registry — Dubai Data Platform' }],
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Dubai Real Estate Intelligence | The City Registry',
            description: 'Institutional-grade Dubai property data. Powered by DLD and Bayut.',
            images: ['/images/terminal-social.png'],
        },
    }
}

function getTerminalSchema(isCityRegistry: boolean) {
    if (isCityRegistry) {
        return {
            "@context": "https://schema.org",
            "@type": "DataCatalog",
            "@id": "https://thecityregistry.com/terminal#catalog",
            "name": "The City Registry — Dubai Real Estate Data Platform",
            "alternateName": "TCR Dubai Data Terminal",
            "description": "Institutional-grade Dubai property market intelligence. Aggregated from Dubai Land Department (DLD) official transaction registry and Bayut property listings API. Covers 1.66 million+ registered transactions across 2,000+ communities, with daily updates. Includes transaction analytics, price indices, rental yield maps, developer track records, supply pipeline, and distress deal scanner.",
            "url": "https://thecityregistry.com/terminal",
            "creator": { "@type": "Organization", "name": "The City Registry", "url": "https://thecityregistry.com" },
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
                {
                    "@type": "Dataset",
                    "name": "DLD Service Charge Registry",
                    "description": "Annual service charge per unit and per community from DLD RERA filings",
                    "publisher": { "@type": "GovernmentOrganization", "name": "Real Estate Regulatory Agency (RERA), Dubai", "url": "https://dubailand.gov.ae/en/rera/" },
                },
            ],
            "dataset": [
                { "@type": "Dataset", "@id": "https://thecityregistry.com/terminal/transaction-pulse#dataset", "name": "Dubai Transaction Pulse", "description": "Monthly sales, mortgage, and gift transaction counts and AED values across all Dubai communities since 2000. Daily updates. 1.66M+ transactions.", "url": "https://thecityregistry.com/terminal/transaction-pulse", "temporalCoverage": "2000-01-01/.." },
                { "@type": "Dataset", "@id": "https://thecityregistry.com/terminal/communities#dataset", "name": "Dubai Community Market Intelligence", "description": "Price per sq ft, transaction volume, YoY price change, supply pipeline for 300+ Dubai communities.", "url": "https://thecityregistry.com/terminal/communities", "temporalCoverage": "2020-01-01/.." },
                { "@type": "Dataset", "@id": "https://thecityregistry.com/terminal/yield-map#dataset", "name": "Dubai Rental Yield Map", "description": "Gross rental yield by area and bedroom type. Derived from DLD rental registrations and sale transaction prices.", "url": "https://thecityregistry.com/terminal/yield-map", "temporalCoverage": "2022-01-01/.." },
                { "@type": "Dataset", "@id": "https://thecityregistry.com/terminal/area-momentum#dataset", "name": "Dubai Area Momentum Scores", "description": "Composite momentum score combining price-per-sqft delta and transaction volume delta.", "url": "https://thecityregistry.com/terminal/area-momentum", "temporalCoverage": "2022-01-01/.." },
                { "@type": "Dataset", "@id": "https://thecityregistry.com/terminal/price-index#dataset", "name": "Dubai Residential Price Index", "description": "DLD residential price index tracking average price per sqm over time by property type.", "url": "https://thecityregistry.com/terminal/price-index", "temporalCoverage": "2008-01-01/.." },
                { "@type": "Dataset", "@id": "https://thecityregistry.com/terminal/supply-pipeline#dataset", "name": "Dubai Off-Plan Supply Pipeline", "description": "Active, pending, and not-started DLD-registered projects by developer, area, and unit count.", "url": "https://thecityregistry.com/terminal/supply-pipeline", "temporalCoverage": "2010-01-01/.." },
                { "@type": "Dataset", "@id": "https://thecityregistry.com/terminal/service-charges#dataset", "name": "Dubai RERA Service Charge Registry", "description": "Annual service charge per sq ft by building and community from DLD RERA filings. 45,000+ buildings.", "url": "https://thecityregistry.com/terminal/service-charges", "temporalCoverage": "2018-01-01/.." },
                { "@type": "Dataset", "@id": "https://thecityregistry.com/terminal/developer-track#dataset", "name": "Dubai Developer Track Record", "description": "Developer league table ranked by DLD-registered total unit count, pipeline exposure, and project completion rate.", "url": "https://thecityregistry.com/terminal/developer-track", "temporalCoverage": "2005-01-01/.." },
                { "@type": "Dataset", "@id": "https://thecityregistry.com/terminal/distress-deals#dataset", "name": "Dubai Distress Deals Scanner", "description": "Below-market property listings with discount-to-market percentage and days-on-market.", "url": "https://thecityregistry.com/terminal/distress-deals", "temporalCoverage": "2024-01-01/.." },
                { "@type": "Dataset", "@id": "https://thecityregistry.com/terminal/floor-plan-pricer#dataset", "name": "Dubai Floor Plan Price Distribution", "description": "P10/P25/P50/P75/P90 price percentile distributions per area and bedroom type.", "url": "https://thecityregistry.com/terminal/floor-plan-pricer", "temporalCoverage": "2022-01-01/.." },
            ],
            "spatialCoverage": {
                "@type": "Place",
                "name": "Dubai, United Arab Emirates",
                "geo": { "@type": "GeoCoordinates", "latitude": "25.2048", "longitude": "55.2708" },
                "address": { "@type": "PostalAddress", "addressLocality": "Dubai", "addressCountry": "AE" },
            },
            "temporalCoverage": "2000-01-01/..",
            "dateModified": new Date().toISOString().slice(0, 10),
            "inLanguage": "en",
            "license": "https://thecityregistry.com/terms",
            "isAccessibleForFree": false,
            "measurementTechnique": "Daily ingestion from Dubai Land Department official registry and Bayut property listings feed. Aggregated into materialized views updated nightly.",
            "keywords": [
                "Dubai real estate data", "Dubai property analytics", "DLD transaction data platform",
                "Dubai Land Department analytics", "Dubai community market data", "UAE property intelligence",
                "Dubai rental yield data", "Dubai off-plan pipeline", "Dubai developer track record",
                "institutional real estate data Dubai",
            ],
        }
    }
    return {
        "@context": "https://schema.org",
        "@type": "Dataset",
        "name": "The City Registry — Dubai Real Estate Data Terminal",
        "description": "Institutional-grade Dubai property market intelligence. Aggregated from Dubai Land Department (DLD) official transaction registry and Bayut property listings API.",
        "url": "https://thecityregistry.com/terminal",
        "creator": { "@type": "Organization", "name": "The City Registry", "url": "https://thecityregistry.com" },
        "variableMeasured": ["Rental Yields", "Price per Square Foot", "Market Occupancy", "Transaction Volume", "Distress Sale Discounts"],
    }
}

export default async function InvestorTerminalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const headersList = await headers()
    const site = headersList.get("x-site") ?? "northcapital"
    const isCityRegistry = site === "cityregistry"

    return (
        <div className={`min-h-screen bg-background text-foreground${isCityRegistry ? ' cityregistry' : ''}`}>
            <CityRegistryTheme enabled={isCityRegistry} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(getTerminalSchema(isCityRegistry)) }}
            />
            <InvestorSidebar />
            <main className="lg:pl-64 flex flex-col min-h-screen">
                <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/50 bg-background/95 backdrop-blur-md px-6 lg:px-8">
                    <div className="flex flex-1 items-center justify-between">
                        <div className="flex items-center gap-4">
                            <MobileNav />
                            {/* Title — desktop only */}
                            <h1 className="hidden sm:flex text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-widest items-center gap-2">
                                        <>
                                        <span className="text-foreground font-semibold tracking-wider">The City Registry</span>
                                        <span className="mx-2 opacity-20">/</span>
                                        <span className="font-mono text-[10px]" style={{ color: '#00BFA5' }}>UAE Real Estate Intelligence</span>
                                    </>
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <FeedbackModal />
                            <UserNav />
                            <ThemeToggle />
                            {/* Live badge — desktop only */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 shrink-0">
                                <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#00BFA5' }} />
                                <span className="text-[10px] uppercase tracking-tighter text-muted-foreground font-mono font-medium">
                                    ↻ LIVE
                                </span>
                            </div>
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
