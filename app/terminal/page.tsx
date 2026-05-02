import Link from "next/link"
import { terminalPageMeta } from "@/lib/terminal-metadata"
import { ChevronRight, Globe, MapPin, Zap, Twitter, Lightbulb } from "lucide-react"
import { StatCard } from "@/components/terminal/stat-card"
import { TerminalTickerCards } from "@/components/terminal/ticker-cards"
import { FeatureRequestForm } from "@/components/terminal/feature-request-form"
import { client } from "@/sanity/lib/client"
import { TERMINAL_ICONS, SanityTerminalCategory } from "@/lib/terminal"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Market Intelligence Terminal",
    description: "Aggregated macro-economic datasets for the Dubai real estate market. Institutional-grade analysis of yields, pricing, and occupancy.",
    path: "/terminal",
  })
}

async function getTerminalData(): Promise<SanityTerminalCategory[]> {
    return client.fetch(`
        *[_type == "terminalCategory" && slug.current != "system"] | order(order asc) {
            _id,
            title,
            slug,
            icon,
            order,
            description,
            strategicVerdict,
            metrics
        }
    `)
}

export default async function InvestorTerminalPage() {
    const categories = await getTerminalData()

    return (
        <div className="space-y-10 max-w-[1600px] mx-auto pb-24 lg:pb-10 px-4 sm:px-0">
            <header className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">Market Intelligence Terminal</h2>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                        Aggregated macro-economic datasets from data.dubai and DLD. Interpreted for institutional-grade decision making.
                    </p>
                </div>

                {/* Live market ticker */}
                <TerminalTickerCards />

            {/* City selector */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium mr-1">Market</span>

                    {/* Active: Dubai */}
                    <div className="flex items-center gap-1.5 rounded-md bg-accent/10 border border-accent/30 px-3 py-1.5 text-accent">
                        <MapPin className="h-3 w-3" />
                        <span className="text-xs font-semibold tracking-wide">Dubai</span>
                    </div>

                    {/* Coming soon cities */}
                    {[
                        { city: "Toronto", flag: "🇨🇦" },
                        { city: "London", flag: "🇬🇧" },
                        { city: "Singapore", flag: "🇸🇬" },
                        { city: "New York", flag: "🇺🇸" },
                    ].map(({ city, flag }) => (
                        <div
                            key={city}
                            className="flex items-center gap-1.5 rounded-md border border-border/40 px-3 py-1.5 text-muted-foreground/40 cursor-not-allowed select-none"
                        >
                            <span className="text-xs">{flag}</span>
                            <span className="text-xs font-medium">{city}</span>
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground/30 border border-muted-foreground/20 rounded px-1 py-px ml-0.5">Soon</span>
                        </div>
                    ))}
                </div>
            </header>

            {/* Grid Layout - Category Groups */}
            <div className="grid gap-8 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
                {categories.map((category) => {
                    const CategoryIcon = TERMINAL_ICONS[category.icon] || Globe

                    return (
                        <section
                            key={category._id}
                            className="space-y-4 group/section rounded-xl border border-transparent p-2 -m-2 transition-all hover:border-border/30 hover:bg-secondary/20"
                        >
                            <Link href={`/terminal/${category.slug.current}`} className="flex items-center justify-between border-b border-border/30 pb-2 transition-colors group-hover/section:border-accent">
                                <div className="flex items-center gap-2">
                                    <CategoryIcon className="h-4 w-4 text-accent" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest transition-colors group-hover/section:text-accent">
                                        {category.title}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-medium text-muted-foreground/0 transition-all group-hover/section:text-muted-foreground/60 group-hover/section:mr-1">View Analysis</span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-all group-hover/section:text-accent group-hover/section:translate-x-1" />
                                </div>
                            </Link>
                            <div className="grid grid-cols-2 gap-3">
                                {category.metrics?.map((metric, idx) => (
                                    <StatCard
                                        key={idx}
                                        label={metric.label}
                                        value={metric.value}
                                        trend={metric.trend}
                                        trendDir={metric.trendDir}
                                        description={metric.description}
                                    />
                                ))}
                            </div>
                        </section>
                    )
                })}
            </div>

            {/* Bottom rail: X follow CTA + Feature Request */}
            <div className="grid gap-6 md:grid-cols-2 border-t border-border/30 pt-10">
                {/* X (Twitter) Follow CTA */}
                <div className="rounded-xl border border-border/40 bg-card/40 p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Twitter className="h-4 w-4 text-foreground" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Follow for Updates</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        New datasets, feature releases, and market signals — announced first on X.
                        No noise. When we post, it&apos;s because something moved.
                    </p>
                    <Link
                        href="https://x.com/northcapitaldxb"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md bg-foreground text-background text-xs font-bold px-4 py-2.5 w-fit hover:bg-foreground/80 transition-colors"
                    >
                        <Twitter className="h-3.5 w-3.5" />
                        Follow @northcapitaldxb
                    </Link>
                </div>

                {/* Feature Request */}
                <div className="rounded-xl border border-border/40 bg-card/40 p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-accent" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Request a Feature</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Missing a dataset or drill-down? Tell us. The terminal is built around what serious investors actually need.
                    </p>
                    <FeatureRequestForm />
                </div>
            </div>
        </div>
    )
}
