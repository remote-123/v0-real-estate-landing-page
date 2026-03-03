"use client"

import Link from "next/link"
import { notFound } from "next/navigation"
import { useState, useMemo, use } from "react"
import {
    ArrowLeft,
    TrendingUp,
    Users,
    Plane,
    Ship,
    Hotel,
    Database,
    BarChart3,
    Calendar,
    ShieldCheck,
    Zap,
    Globe,
    Briefcase,
    GraduationCap,
    ChevronRight
} from "lucide-react"
import { StatCard } from "@/components/investor-terminal/stat-card"
import { MarketChart } from "@/components/investor-terminal/market-chart"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Category = "economic" | "infrastructure" | "society" | "logistics" | "hospitality" | "system"

interface Metric {
    label: string
    value: string
    trend?: string
    trendDir?: "up" | "down" | "neutral"
    description: string
    icon?: any
    history: { name: string, value: number }[]
}

interface CategoryData {
    title: string
    icon: any
    description: string
    metrics: Metric[]
    curation: {
        title: string
        content: string
    }
}

const CATEGORY_MAP: Record<string, CategoryData> = {
    economic: {
        title: "Economic Foundations",
        icon: TrendingUp,
        description: "Macro-level fiscal indicators and financial market performance.",
        metrics: [
            {
                label: "GDP Forecast 2026", value: "+4.8%", trend: "Strong", trendDir: "up", description: "Above GCC average; indicates resilience against global slowdown.",
                history: [{ name: "2021", value: 3.2 }, { name: "2022", value: 3.8 }, { name: "2023", value: 4.2 }, { name: "2024", value: 4.5 }, { name: "2025", value: 4.7 }, { name: "2026", value: 4.8 }]
            },
            {
                label: "M2 Money Supply", value: "AED 2.4T", trend: "+14%", trendDir: "up", description: "High liquidity confirms capital flight towards Dubai safe-haven.",
                history: [{ name: "2021", value: 1.8 }, { name: "2022", value: 1.95 }, { name: "2023", value: 2.1 }, { name: "2024", value: 2.25 }, { name: "2025", value: 2.35 }, { name: "2026", value: 2.4 }]
            },
            {
                label: "CPI (Inflation)", value: "3.1%", trend: "-0.2%", trendDir: "down", description: "Managing price stability well relative to OECD nations.",
                history: [{ name: "2021", value: 2.8 }, { name: "2022", value: 3.5 }, { name: "2023", value: 4.1 }, { name: "2024", value: 3.7 }, { name: "2025", value: 3.3 }, { name: "2026", value: 3.1 }]
            },
            {
                label: "Physical Licenses", value: "384k", trend: "+8.4%", trendDir: "up", description: "Real physical business growth, not just paper companies.",
                history: [{ name: "2021", value: 310 }, { name: "2022", value: 325 }, { name: "2023", value: 345 }, { name: "2024", value: 360 }, { name: "2025", value: 375 }, { name: "2026", value: 384 }]
            },
            {
                label: "Nasdaq Dubai Vol", value: "AED 1.2B", trend: "+4%", trendDir: "up", description: "Secondary market liquidity remains healthy.",
                history: [{ name: "2021", value: 0.8 }, { name: "2022", value: 0.95 }, { name: "2023", value: 1.05 }, { name: "2024", value: 1.12 }, { name: "2025", value: 1.18 }, { name: "2026", value: 1.2 }]
            },
            {
                label: "Bounced Cheques Rate", value: "1.8%", trend: "-0.5%", trendDir: "down", description: "Enhanced Credit Bureau scoring improving market discipline.",
                history: [{ name: "2021", value: 2.4 }, { name: "2022", value: 2.2 }, { name: "2023", value: 2.0 }, { name: "2024", value: 1.95 }, { name: "2025", value: 1.85 }, { name: "2026", value: 1.8 }]
            }
        ],
        curation: {
            title: "The Macro Thesis",
            content: "Dubai's decoupling from broader global inflation trends is a result of fiscal discipline and aggressive sovereign wealth deployment. For investors, this means capital preservation is high, even if global volatility persists."
        }
    },
    infrastructure: {
        title: "Macro Infrastructure",
        icon: Plane,
        description: "Mobility, connectivity, and utility capacity analysis.",
        metrics: [
            {
                label: "Metro Passenger Vol", value: "1.8M/d", trend: "+12%", trendDir: "up", description: "Supports TOD premiums in communities like Al Furjan.",
                history: [{ name: "Jan", value: 1.2 }, { name: "Mar", value: 1.4 }, { name: "May", value: 1.5 }, { name: "Jul", value: 1.6 }, { name: "Sep", value: 1.7 }, { name: "Nov", value: 1.8 }]
            },
            {
                label: "Salik Transactions", value: "480M", trend: "+6%", trendDir: "up", description: "Increased city-wide mobility across all core toll points.",
                history: [{ name: "Q1", value: 105 }, { name: "Q2", value: 112 }, { name: "Q3", value: 124 }, { name: "Q4", value: 139 }]
            },
            {
                label: "Building Certificates", value: "4,200", trend: "+15%", trendDir: "up", description: "Record completions expected in the next 18 months.",
                history: [{ name: "2021", value: 2800 }, { name: "2022", value: 3100 }, { name: "2023", value: 3500 }, { name: "2024", value: 3800 }, { name: "2025", value: 4050 }, { name: "2026", value: 4200 }]
            },
            {
                label: "Energy Surplus", value: "1.2GW", trend: "Steady", trendDir: "neutral", description: "Sufficient capacity for the 2026 delivery cycle.",
                history: [{ name: "2021", value: 0.9 }, { name: "2022", value: 0.95 }, { name: "2023", value: 1.1 }, { name: "2024", value: 1.15 }, { name: "2025", value: 1.2 }, { name: "2026", value: 1.2 }]
            }
        ],
        curation: {
            title: "The Expansion Meter",
            content: "The expansion of the taxi fleet and driver registrations specifically in the 'South Corridor' indicates that the market is shifting its weight towards DWC and Emaar South ahead of the 2030 vision."
        }
    },
    society: {
        title: "Society & Commitment",
        icon: Users,
        description: "Demographics, social infrastructure, and resident longevity.",
        metrics: [
            {
                label: "School Enrollment", value: "342k", trend: "+7.2%", trendDir: "up", description: "Long-term commitment indicator; family-centric demand.",
                history: [{ name: "2021", value: 285 }, { name: "2022", value: 298 }, { name: "2023", value: 312 }, { name: "2024", value: 325 }, { name: "2025", value: 334 }, { name: "2026", value: 342 }]
            },
            {
                label: "Golden Visa Holders", value: "152k", trend: "+60%", trendDir: "up", description: "High-net-worth migration; capital preservation intent.",
                history: [{ name: "2021", value: 45 }, { name: "2022", value: 68 }, { name: "2023", value: 92 }, { name: "2024", value: 115 }, { name: "2025", value: 138 }, { name: "2026", value: 152 }]
            },
            {
                label: "Sewage Collected", value: "1.8M m3", trend: "+5%", trendDir: "up", description: "Scaling city services for the 5.8M 2040 population target.",
                history: [{ name: "2021", value: 1.4 }, { name: "2022", value: 1.55 }, { name: "2023", value: 1.65 }, { name: "2024", value: 1.72 }, { name: "2025", value: 1.78 }, { name: "2026", value: 1.8 }]
            },
            {
                label: "Police Response Time", value: "2.4m", trend: "-10%", trendDir: "up", description: "Safety metrics remain best-in-class, driving investor trust.",
                history: [{ name: "2021", value: 3.5 }, { name: "2022", value: 3.2 }, { name: "2023", value: 2.9 }, { name: "2024", value: 2.7 }, { name: "2025", value: 2.5 }, { name: "2026", value: 2.4 }]
            }
        ],
        curation: {
            title: "Inelastic Demand",
            content: "School enrollment growth is the single best predictor for 3-4BR villa demand. When families commit to education locally, they commit to 5-10 year housing cycles, protecting against short-term rental fluctuations."
        }
    },
    logistics: {
        title: "Logistics & Trade",
        icon: Ship,
        description: "Global trade flows and cargo volumes.",
        metrics: [
            {
                label: "Foreign Trade Vol", value: "AED 2.1T", trend: "+18%", trendDir: "up", description: "Trade growth outpaces real estate; healthy diversification.",
                history: [{ name: "2021", value: 1.4 }, { name: "2022", value: 1.6 }, { name: "2023", value: 1.8 }, { name: "2024", value: 1.95 }, { name: "2025", value: 2.05 }, { name: "2026", value: 2.1 }]
            },
            {
                label: "DWC Cargo Capacity", value: "3.2M Tons", trend: "+5%", trendDir: "up", description: "South Dubai (Emaar South) is the 10-year growth corridor.",
                history: [{ name: "2021", value: 2.4 }, { name: "2022", value: 2.65 }, { name: "2023", value: 2.85 }, { name: "2024", value: 3.05 }, { name: "2025", value: 3.15 }, { name: "2026", value: 3.2 }]
            }
        ],
        curation: {
            title: "The Sleeper Play",
            content: "While residential gets the headlines, the logistics growth (AED 2.1T) makes industrial real estate in Dubai South the most undervalued asset class for institutional portfolio diversification."
        }
    },
    hospitality: {
        title: "Hospitality & Yields",
        icon: Hotel,
        description: "Tourism performance and rental yield benchmarks.",
        metrics: [
            {
                label: "Hotel Occupancy", value: "78.4%", trend: "+3%", trendDir: "up", description: "Strong occupancy supports hotel-apartment ROI models.",
                history: [{ name: "Jan", value: 65 }, { name: "Mar", value: 72 }, { name: "May", value: 68 }, { name: "Jul", value: 60 }, { name: "Sep", value: 74 }, { name: "Nov", value: 78.4 }]
            },
            {
                label: "RevPAR", value: "AED 640", trend: "+12%", trendDir: "up", description: "Revenue per room rising; yields for investors are healthy.",
                history: [{ name: "2021", value: 420 }, { name: "2022", value: 480 }, { name: "2023", value: 550 }, { name: "2024", value: 590 }, { name: "2025", value: 620 }, { name: "2026", value: 640 }]
            }
        ],
        curation: {
            title: "Grade A Focus",
            content: "With 8,000+ new rooms entering the market, yield compression is inevitable for mid-tier assets. We recommend shifting focus to ultra-luxury or secondary hub hotel-apartments with unique operator value."
        }
    },
    system: {
        title: "Terminal Health",
        icon: Database,
        description: "Technical status of the North Capital data pipeline.",
        metrics: [
            {
                label: "Data Pipeline", value: "Syncing", trend: "99.9%", trendDir: "up", icon: Globe, description: "Direct feed from data.dubai and DLD APIs active.",
                history: [{ name: "00:00", value: 98 }, { name: "04:00", value: 99 }, { name: "08:00", value: 99.9 }, { name: "12:00", value: 99.8 }, { name: "16:00", value: 99.9 }, { name: "20:00", value: 99.9 }]
            },
            {
                label: "AI Model", value: "Gemini Flash", trend: "Verified", trendDir: "neutral", icon: Zap, description: "Multimodal processing of developer PDFs active.",
                history: [{ name: "Q1", value: 85 }, { name: "Q2", value: 92 }, { name: "Q3", value: 98 }, { name: "Q4", value: 100 }]
            }
        ],
        curation: {
            title: "Pipeline Status",
            content: "The North Capital data engine is currently processing 14 developer PRs and 3 macro datasets. All systems functioning within institutional latency thresholds."
        }
    }
}

export default function CategoryDrillDownPage({ params }: { params: Promise<{ category: string }> }) {
    const { category } = use(params)
    const data = CATEGORY_MAP[category]
    const [selectedMetric, setSelectedMetric] = useState<Metric | null>(data?.metrics[0] || null)

    if (!data) {
        notFound()
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col gap-4">
                <Link href="/investor-terminal">
                    <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground group">
                        <div className="rounded-full bg-secondary/50 p-1 transition-colors group-hover:bg-accent/20">
                            <ArrowLeft className="h-3.5 w-3.5" />
                        </div>
                        Back to Overview
                    </Button>
                </Link>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-accent/10 p-2">
                            <data.icon className="h-6 w-6 text-accent" />
                        </div>
                        <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">{data.title}</h2>
                    </div>
                    <p className="text-muted-foreground max-w-2xl">{data.description}</p>
                </div>
            </header>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Main Content: Chart & Dense Grid */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-accent">Trend Analysis</h3>
                                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                                    Historical {selectedMetric?.label}
                                </h4>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10",
                                    selectedMetric?.trendDir === "up" ? "text-emerald-500" :
                                        selectedMetric?.trendDir === "down" ? "text-red-500" :
                                            "text-muted-foreground bg-muted/10"
                                )}>
                                    {selectedMetric?.trendDir === "up" && <TrendingUp className="h-3 w-3" />}
                                    {selectedMetric?.trend} Performance
                                </span>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            {selectedMetric && (
                                <MarketChart key={selectedMetric.label} data={selectedMetric.history} />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {data.metrics.map((metric, idx) => (
                            <StatCard
                                key={idx}
                                {...metric}
                                isActive={selectedMetric?.label === metric.label}
                                onClick={() => setSelectedMetric(metric)}
                            />
                        ))}
                    </div>
                </div>

                {/* Sidebar: Curation & Recommendations */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="rounded-xl border border-border/40 bg-accent/5 p-6 space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            Strategic Verdict
                        </h3>
                        <div className="space-y-3">
                            <h4 className="font-semibold text-lg text-foreground">{data.curation.title}</h4>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {data.curation.content}
                            </p>
                        </div>
                        <div className="pt-4 border-t border-border/30">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">Next Tactical Move</p>
                            <Link href="/investor-terminal/roi-engine" className="text-xs font-bold text-foreground hover:text-accent transition-colors flex items-center gap-2 group">
                                Model ROI for this category
                                <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border/40 bg-card p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Risk Assessment</h3>
                        <div className="space-y-4">
                            {[
                                { label: "Market Volatility", value: "Low", color: "text-emerald-500" },
                                { label: "Policy Shift Risk", value: "Moderate", color: "text-amber-500" },
                                { label: "Liquidity Buffer", value: "High", color: "text-emerald-500" },
                            ].map((risk) => (
                                <div key={risk.label} className="flex items-center justify-between border-b border-border/20 pb-2">
                                    <span className="text-xs text-muted-foreground">{risk.label}</span>
                                    <span className={`text-xs font-bold ${risk.color}`}>{risk.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
