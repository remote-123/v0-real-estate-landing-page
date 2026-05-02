import React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { Calendar } from "lucide-react"
import { InvestorSidebar } from "@/components/terminal/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { FeedbackModal } from "@/components/terminal/feedback-modal"
import { MobileNav } from "@/components/terminal/mobile-nav"
import { Button } from "@/components/ui/button"
import { SITE_CONFIG } from "@/lib/constants"
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
        title: 'Investor Terminal | North Capital DXB',
        description: 'Institutional-grade real estate metrics, market intelligence, and distress deal scanning for the Dubai market.',
        openGraph: {
            title: 'Investor Terminal | North Capital DXB',
            description: 'Institutional-grade real estate metrics, market intelligence, and distress deal scanning for the Dubai market.',
            images: [{ url: '/images/terminal-social.png', width: 1200, height: 630, alt: 'North Capital Investor Terminal' }],
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Investor Terminal | North Capital DXB',
            description: 'Institutional-grade real estate metrics, market intelligence, and distress deal scanning for the Dubai market.',
            images: ['/images/terminal-social.png'],
        },
    }
}

function getTerminalSchema(isCityRegistry: boolean) {
    if (isCityRegistry) {
        return {
            "@context": "https://schema.org",
            "@type": "DataCatalog",
            "name": "The City Registry — Dubai Real Estate Data Platform",
            "description": "Comprehensive Dubai property market intelligence. Aggregated from Dubai Land Department (DLD) and Bayut transaction records covering sales, mortgages, rental yields, and supply pipeline.",
            "url": "https://thecityregistry.com/terminal",
            "creator": { "@type": "Organization", "name": "The City Registry", "url": "https://thecityregistry.com" },
            "dataset": [
                { "@type": "Dataset", "name": "Dubai Transaction Pulse", "description": "Monthly sales, mortgage, and gift transaction volumes by community", "url": "https://thecityregistry.com/terminal/transaction-pulse" },
                { "@type": "Dataset", "name": "Dubai Community Screener", "description": "Area-level price per sq ft, yield, and transaction count metrics", "url": "https://thecityregistry.com/terminal/communities" },
                { "@type": "Dataset", "name": "Dubai Yield Map", "description": "Gross rental yield by area and bedroom type", "url": "https://thecityregistry.com/terminal/yield-map" },
                { "@type": "Dataset", "name": "Dubai Distress Deals", "description": "Below-market listings with discount percentage and days-on-market", "url": "https://thecityregistry.com/terminal/distress-deals" },
                { "@type": "Dataset", "name": "Dubai Area Momentum", "description": "Momentum scoring combining price delta and transaction volume delta", "url": "https://thecityregistry.com/terminal/area-momentum" },
            ],
            "spatialCoverage": { "@type": "Place", "name": "Dubai, United Arab Emirates" },
            "temporalCoverage": "2020/..",
            "license": "https://thecityregistry.com/terms",
        }
    }
    return {
        "@context": "https://schema.org",
        "@type": "Dataset",
        "name": "North Capital Dubai Investor Terminal",
        "description": "Institutional-grade real estate metrics, market intelligence, and distress deal scanning for the Dubai market. Aggregated macro-economic datasets from data.dubai and DLD.",
        "url": "/terminal",
        "creator": { "@type": "Organization", "name": "North Capital DXB" },
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
                            <h1 className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                {isCityRegistry ? (
                                    <>
                                        <span className="hidden sm:inline text-foreground font-semibold tracking-wider">The City Registry</span>
                                        <span className="sm:mx-2 opacity-20">/</span>
                                        <span className="font-mono text-[10px]" style={{ color: '#00BFA5' }}>UAE Real Estate Intelligence</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="hidden sm:inline">Investor Terminal</span>
                                        <span className="sm:mx-2 opacity-30">/</span>
                                        <span className="text-foreground">v1.0.4</span>
                                    </>
                                )}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            {isCityRegistry && (
                                <div
                                    className="hidden sm:flex items-center rounded px-2 py-0.5 text-[10px] font-mono font-bold"
                                    style={{ background: '#00BFA5', color: '#000' }}
                                >
                                    PRO
                                </div>
                            )}
                            {!isCityRegistry && (
                                <Button asChild variant="outline" size="sm" className="hidden sm:flex gap-2 border-accent/20 hover:bg-accent/10 hover:text-accent transition-colors">
                                    <Link href={SITE_CONFIG.calendarLink} target="_blank">
                                        <Calendar className="h-3 w-3" />
                                        Book an Appointment
                                    </Link>
                                </Button>
                            )}
                            <FeedbackModal />
                            <UserNav />
                            {!isCityRegistry && <ThemeToggle />}
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 shrink-0">
                                {isCityRegistry
                                    ? <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#00BFA5' }} />
                                    : <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                }
                                <span className="text-[10px] uppercase tracking-tighter text-muted-foreground font-mono font-medium">
                                    {isCityRegistry ? '↻ LIVE' : 'Market Open'}
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
