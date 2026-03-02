import { TrendingUp, BarChart3, ArrowUpRight, ShieldCheck } from "lucide-react"

export default function InvestorTerminalPage() {
    return (
        <div className="space-y-8">
            <section>
                <div className="mb-8">
                    <h2 className="font-serif text-3xl font-bold tracking-tight">Market Intelligence</h2>
                    <p className="mt-2 text-muted-foreground">Real-time macro analysis and ROI projections for the Dubai property market.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Macro Stats */}
                    {[
                        { label: "Overall Market Yield", value: "7.4%", trend: "+0.4%", icon: TrendingUp },
                        { label: "Transaction Volume (24h)", value: "AED 1.2B", trend: "+12%", icon: BarChart3 },
                        { label: "Supply Absorption", value: "88%", trend: "High", icon: ShieldCheck },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-xl border border-border/50 bg-card p-6 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div className="rounded-lg bg-secondary p-2">
                                    <stat.icon className="h-5 w-5 text-accent" />
                                </div>
                                <div className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                                    <ArrowUpRight className="h-3 w-3" />
                                    {stat.trend}
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                {/* Placeholder for Main Terminal View */}
                <div className="rounded-xl border border-border/50 bg-card p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-secondary p-4 mb-4">
                        <TrendingUp className="h-8 w-8 text-accent" />
                    </div>
                    <h3 className="text-xl font-bold">The Macro Thesis</h3>
                    <p className="mt-2 text-muted-foreground max-w-sm">The 2026 supply cycle indicates a shift towards secondary market consolidation. Analysis pending...</p>
                </div>

                <div className="rounded-xl border border-border/50 bg-card p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-secondary p-4 mb-4">
                        <BarChart3 className="h-8 w-8 text-accent" />
                    </div>
                    <h3 className="text-xl font-bold">Performance Tracking</h3>
                    <p className="mt-2 text-muted-foreground max-w-sm">Connect your portfolio via Sanity to track unrealized gains and yield performance.</p>
                </div>
            </section>
        </div>
    )
}
