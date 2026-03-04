import Link from "next/link"
import { ChevronRight, Globe, Zap } from "lucide-react"
import { StatCard } from "@/components/investor-terminal/stat-card"
import { client } from "@/sanity/lib/client"
import { TERMINAL_ICONS, SanityTerminalCategory } from "@/lib/terminal"

export const dynamic = 'force-dynamic'

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
        <div className="space-y-10 max-w-[1600px] mx-auto">
            <header className="flex flex-col gap-2">
                <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">Market Intelligence Terminal</h2>
                <p className="text-sm text-muted-foreground max-w-2xl">
                    Aggregated macro-economic datasets from data.dubai and DLD. Interpreted for institutional-grade decision making.
                </p>
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
                            <Link href={`/investor-terminal/${category.slug.current}`} className="flex items-center justify-between border-b border-border/30 pb-2 transition-colors group-hover/section:border-accent">
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
        </div>
    )
}
