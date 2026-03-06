import { TrendingUp, ShieldCheck, Globe, Zap } from "lucide-react"

export function MarketIntelligenceTeaser() {
    const dataPoints = [
        {
            label: "Average Net Yield",
            value: "7.2% - 9.5%",
            description: "Institutional-grade rental returns in prime Dubai hubs.",
            icon: TrendingUp,
        },
        {
            label: "Personal Income Tax",
            value: "0%",
            description: "Zero tax on rental income and capital gains for individuals.",
            icon: ShieldCheck,
        },
        {
            label: "Currency Stability",
            value: "USD-Pegged",
            description: "AED is pegged to the USD, providing a stable inflation hedge.",
            icon: Globe,
        },
        {
            label: "Entry Threshold",
            value: "AED 1.2M+",
            description: "Stable entry point for high-scarcity, low-density inventory.",
            icon: Zap,
        },
    ]

    return (
        <section className="bg-secondary/30 py-16 md:py-24 border-y border-border/50">
            <div className="mx-auto max-w-7xl px-6">
                <div className="grid gap-12 lg:grid-cols-2 items-center">
                    <div>
                        <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
                            The North Capital Verdict
                        </p>
                        <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl mb-6">
                            Dubai Market Intelligence for Global Capital
                        </h2>
                        <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                            <p>
                                Dubai real estate has transitioned from a speculative playground to a mature, institutional-grade asset class. With <strong>zero property tax</strong> and <strong>high rental occupancy</strong>, it offers a unique arbitrage opportunity for international investors.
                            </p>
                            <p>
                                Our proprietary <strong>Analytical Filter</strong> identifies community-driven assets that bypass developer fluff, focusing on scarcity and long-term capital preservation in the UAE's USD-pegged economy.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {dataPoints.map((point, idx) => (
                            <div key={idx} className="bg-card border border-border/50 rounded-xl p-6 shadow-sm hover:border-accent/30 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="rounded-lg bg-accent/10 p-2">
                                        <point.icon className="h-5 w-5 text-accent" />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{point.label}</span>
                                </div>
                                <div className="text-2xl font-bold text-foreground mb-2">{point.value}</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{point.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
