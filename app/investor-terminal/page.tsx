import Link from "next/link"
import {
    TrendingUp,
    Users,
    Building2,
    Plane,
    Briefcase,
    GraduationCap,
    Zap,
    Database,
    Globe,
    Truck,
    Ship,
    Hotel,
    ChevronRight
} from "lucide-react"
import { StatCard } from "@/components/investor-terminal/stat-card"

export default function InvestorTerminalPage() {
    return (
        <div className="space-y-10 max-w-[1600px] mx-auto">
            <header className="flex flex-col gap-2">
                <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">Market Intelligence Terminal</h2>
                <p className="text-sm text-muted-foreground max-w-2xl">
                    Aggregated macro-economic datasets from data.dubai and DLD. Interpreted for institutional-grade decision making.
                </p>
            </header>

            {/* Grid Layout - Category Groups */}
            <div className="grid gap-8 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">

                {/* 1. Economic & Financial - The Sentiment Core */}
                <section className="space-y-4 group/section rounded-xl border border-transparent p-2 -m-2 transition-all hover:border-border/30 hover:bg-secondary/20">
                    <Link href="/investor-terminal/economic" className="flex items-center justify-between border-b border-border/30 pb-2 transition-colors group-hover/section:border-accent">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-accent" />
                            <h3 className="text-sm font-bold uppercase tracking-widest transition-colors group-hover/section:text-accent">Economic Foundations</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-muted-foreground/0 transition-all group-hover/section:text-muted-foreground/60 group-hover/section:mr-1">View Analysis</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-all group-hover/section:text-accent group-hover/section:translate-x-1" />
                        </div>
                    </Link>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard label="GDP Forecast 2026" value="+4.8%" trend="Strong" trendDir="up" description="Above GCC average; indicates resilience against global slowdown." />
                        <StatCard label="M2 Money Supply" value="AED 2.4T" trend="+14%" trendDir="up" description="High liquidity confirms capital flight towards Dubai safe-haven." />
                        <StatCard label="CPI (Inflation)" value="3.1%" trend="-0.2%" trendDir="down" description="Managing price stability well relative to OECD nations." />
                        <StatCard label="Physical Licenses" value="384k" trend="+8.4%" trendDir="up" description="Real physical business growth, not just paper companies." />
                        <StatCard label="Nasdaq Performance" value="3,840" trend="+1.2%" trendDir="up" description="Equities correlation with real estate remains tight." />
                        <StatCard label="Bounced Cheques" value="1.8%" trend="-0.5%" trendDir="down" description="Improved payment discipline; lower counterparty risk." />
                    </div>
                </section>

                {/* 2. Infrastructure & Mobility - The Expansion Meter */}
                <section className="space-y-4 group/section rounded-xl border border-transparent p-2 -m-2 transition-all hover:border-border/30 hover:bg-secondary/20">
                    <Link href="/investor-terminal/infrastructure" className="flex items-center justify-between border-b border-border/30 pb-2 transition-colors group-hover/section:border-accent">
                        <div className="flex items-center gap-2">
                            <Plane className="h-4 w-4 text-accent" />
                            <h3 className="text-sm font-bold uppercase tracking-widest transition-colors group-hover/section:text-accent">Macro Infrastructure</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-muted-foreground/0 transition-all group-hover/section:text-muted-foreground/60 group-hover/section:mr-1">View Analysis</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-all group-hover/section:text-accent group-hover/section:translate-x-1" />
                        </div>
                    </Link>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Metro Passenger Vol" value="1.8M/d" trend="+12%" trendDir="up" description="High utilization supports TOD (Transit Oriented Development) premiums." />
                        <StatCard label="Dubai Airport Traffic" value="86M/y" trend="Record" trendDir="up" description="Visitor flow driving short-term rental demand (AirBnB)." />
                        <StatCard label="Salik Transactions" value="480M" trend="+6%" trendDir="up" description="Increased mobility indicates eastward city expansion (D33)." />
                        <StatCard label="Mobile Subscriptions" value="18.4M" trend="+4%" trendDir="up" description="Data-heavy population drives demand for tech-integrated units." />
                        <StatCard label="Taxi Fleet Size" value="12.2k" trend="+15%" trendDir="up" description="Scaling for tourism surge; JVC and Tilal Al Ghaf benefiting." />
                        <StatCard label="Energy Surplus" value="1.2GW" trend="Steady" trendDir="neutral" description="Sufficient buffer for the 2026 delivery cycle." />
                    </div>
                </section>

                {/* 3. Society & Commitment - The Long-Term Play */}
                <section className="space-y-4 group/section rounded-xl border border-transparent p-2 -m-2 transition-all hover:border-border/30 hover:bg-secondary/20">
                    <Link href="/investor-terminal/society" className="flex items-center justify-between border-b border-border/30 pb-2 transition-colors group-hover/section:border-accent">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-accent" />
                            <h3 className="text-sm font-bold uppercase tracking-widest transition-colors group-hover/section:text-accent">Society & Commitment</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-muted-foreground/0 transition-all group-hover/section:text-muted-foreground/60 group-hover/section:mr-1">View Analysis</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-all group-hover/section:text-accent group-hover/section:translate-x-1" />
                        </div>
                    </Link>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard label="School Enrollment" value="342k" trend="+7.2%" trendDir="up" description="Families stay longer; 3BR+ villa demand will remain inelastic." />
                        <StatCard label="Golden Visa Issued" value="152k" trend="+60%" trendDir="up" description="High-net-worth migration; capital preservation bias." />
                        <StatCard label="Visitor Count (Top 5)" value="India/UK" trend="Shifting" trendDir="neutral" description="Diversified buyer base reduces geopolitical exposure." />
                        <StatCard label="New Masjids/Hospitals" value="42" trend="+12%" trendDir="up" description="Social infrastructure scaling in Al Furjan and Dubailand." />
                        <StatCard label="Workforce Participation" value="84%" trend="Peak" trendDir="up" description="One of the highest globally; real underlying labor demand." />
                        <StatCard label="Unemployment" value="0.5%" trend="Full" trendDir="neutral" description="Effectively full employment; no systemic credit risk." />
                    </div>
                </section>

                {/* 4. Logistics & Global Trade */}
                <section className="space-y-4 group/section rounded-xl border border-transparent p-2 -m-2 transition-all hover:border-border/30 hover:bg-secondary/20">
                    <Link href="/investor-terminal/logistics" className="flex items-center justify-between border-b border-border/30 pb-2 transition-colors group-hover/section:border-accent">
                        <div className="flex items-center gap-2">
                            <Ship className="h-4 w-4 text-accent" />
                            <h3 className="text-sm font-bold uppercase tracking-widest transition-colors group-hover/section:text-accent">Logistics & Trade</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-muted-foreground/0 transition-all group-hover/section:text-muted-foreground/60 group-hover/section:mr-1">View Analysis</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-all group-hover/section:text-accent group-hover/section:translate-x-1" />
                        </div>
                    </Link>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Foreign Trade Vol" value="AED 2.1T" trend="+18%" trendDir="up" description="Trade growth outpaces real estate; diversification working." />
                        <StatCard label="DWC Cargo Capacity" value="3.2M Tons" trend="+5%" trendDir="up" description="South Dubai (Emaar South) is the 10-year growth corridor." />
                        <StatCard label="Re-Export Activity" value="AED 480B" trend="+11%" trendDir="up" description="Dubai remains the global middleman; resilient trade flows." />
                        <StatCard label="E-commerce Growth" value="+22%" trend="Aggressive" trendDir="up" description="Warehousing/Industrial demand is a sleeper investment play." />
                    </div>
                </section>

                {/* 5. Hospitality & Yields */}
                <section className="space-y-4 group/section rounded-xl border border-transparent p-2 -m-2 transition-all hover:border-border/30 hover:bg-secondary/20">
                    <Link href="/investor-terminal/hospitality" className="flex items-center justify-between border-b border-border/30 pb-2 transition-colors group-hover/section:border-accent">
                        <div className="flex items-center gap-2">
                            <Hotel className="h-4 w-4 text-accent" />
                            <h3 className="text-sm font-bold uppercase tracking-widest transition-colors group-hover/section:text-accent">Hospitality & Yields</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-muted-foreground/0 transition-all group-hover/section:text-muted-foreground/60 group-hover/section:mr-1">View Analysis</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-all group-hover/section:text-accent group-hover/section:translate-x-1" />
                        </div>
                    </Link>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Hotel Occupancy" value="78.4%" trend="+3%" trendDir="up" description="Strong occupancy supports hotel-apartment ROI models." />
                        <StatCard label="RevPAR" value="AED 640" trend="+12%" trendDir="up" description="Revenue per room rising; yields for investors are healthy." />
                        <StatCard label="Room Supply Delta" value="+8.2k" trend="High" trendDir="down" description="Significant supply coming; stick to Grade A beachfront units." />
                        <StatCard label="Avg Stay Length" value="4.2 Nights" trend="+0.4" trendDir="up" description="Tourists staying longer; spending increasing per capita." />
                    </div>
                </section>

                {/* 6. System Health (Pulse) */}
                <section className="space-y-4 group/section rounded-xl border border-transparent p-2 -m-2 transition-all hover:border-border/30 hover:bg-secondary/20">
                    <Link href="/investor-terminal/system" className="flex items-center justify-between border-b border-border/30 pb-2 transition-colors group-hover/section:border-accent">
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-accent" />
                            <h3 className="text-sm font-bold uppercase tracking-widest transition-colors group-hover/section:text-accent">Terminal Health</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/0 transition-all group-hover/section:text-muted-foreground/80 group-hover/section:mr-1">Analyze</span>
                            <div className="rounded-full bg-secondary/50 p-1.5 transition-colors group-hover/section:bg-accent/20">
                                <ChevronRight className="h-3.5 w-3.5 text-foreground/70 transition-all group-hover/section:text-accent group-hover/section:translate-x-0.5" />
                            </div>
                        </div>
                    </Link>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Data Pipeline" value="Syncing" trend="99.9%" trendDir="up" icon={Globe} description="Direct feed from data.dubai and DLD APIs active." />
                        <StatCard label="AI Model" value="Gemini Flash" trend="Verified" trendDir="neutral" icon={Zap} description="Multimodal processing of developer PDFs active." />
                    </div>
                </section>

            </div>
        </div>
    )
}
