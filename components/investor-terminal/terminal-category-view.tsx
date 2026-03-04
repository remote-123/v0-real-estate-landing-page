"use client"

import Link from "next/link"
import { useState, useMemo } from "react"
import {
    ArrowLeft,
    TrendingUp,
    ShieldCheck,
    ChevronRight,
    Globe
} from "lucide-react"
import { StatCard } from "@/components/investor-terminal/stat-card"
import { MarketChart } from "@/components/investor-terminal/market-chart"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TERMINAL_ICONS, SanityTerminalCategory, SanityMetric } from "@/lib/terminal"

interface TerminalCategoryViewProps {
    category: SanityTerminalCategory
}

export function TerminalCategoryView({ category }: TerminalCategoryViewProps) {
    const [selectedMetric, setSelectedMetric] = useState<SanityMetric | null>(category.metrics?.[0] || null)

    const chartData = useMemo(() => {
        if (!selectedMetric?.historicalData) return []
        return selectedMetric.historicalData.map(h => ({
            name: h.year,
            value: h.value
        }))
    }, [selectedMetric])

    const CategoryIcon = TERMINAL_ICONS[category.icon] || Globe

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-24 lg:pb-10">
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
                            <CategoryIcon className="h-6 w-6 text-accent" />
                        </div>
                        <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">{category.title}</h2>
                    </div>
                    <p className="text-muted-foreground max-w-2xl">{category.description}</p>
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
                                <MarketChart key={selectedMetric.label} data={chartData} />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {category.metrics.map((metric, idx) => (
                            <StatCard
                                key={idx}
                                label={metric.label}
                                value={metric.value}
                                trend={metric.trend}
                                trendDir={metric.trendDir}
                                description={metric.description}
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
                            <h4 className="font-semibold text-lg text-foreground">{category.strategicVerdict.title}</h4>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {category.strategicVerdict.content}
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
