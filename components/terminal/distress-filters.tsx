"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { SITE_CONFIG } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"
import Link from "next/link"

export function DistressFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const activeCategory = searchParams.get('type') || "All"
    const activeSort = searchParams.get('sort') || "biggest-drop"
    const activeSource = searchParams.get('source') || "pf"

    const categories = ["All", "Apartment", "Villa", "Townhouse", "Penthouse"]

    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set(key, value)
        router.push(`?${params.toString()}`)
    }

    return (
        <div className="flex flex-col sm:flex-row gap-4 lg:gap-8 items-center justify-between py-6 px-4 sm:px-0">

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto overflow-x-auto no-scrollbar pb-2 sm:pb-0">
                {/* Data Source toggle */}
                <div className="flex gap-1 p-1 rounded-lg bg-secondary/30 border border-border/50 shrink-0">
                    <button
                        onClick={() => updateFilter('source', 'pf')}
                        className={`px-4 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${activeSource === 'pf' ? 'bg-accent text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        PROPERTY FINDER
                    </button>
                    <button
                        onClick={() => updateFilter('source', 'bayut')}
                        className={`px-4 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${activeSource === 'bayut' ? 'bg-accent text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        BAYUT DATA
                    </button>
                </div>

                {/* Category segmented control */}
                <div className="flex gap-2 p-1 rounded-lg bg-secondary/30 border border-border/50 shrink-0">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => updateFilter('type', cat)}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${activeCategory === cat
                                ? "bg-accent text-accent-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <Button asChild variant="outline" size="sm" className="gap-2 border-accent/20 hover:bg-accent/10 hover:text-accent transition-colors">
                                                <Link href={SITE_CONFIG.calendarLink} target="_blank">
                                                    <Calendar className="h-3 w-3" />
                                                    Schedule ROI Briefing
                                                </Link>
                                            </Button>
            </div>

            {/* Sorting Dropdown */}
            <div className="w-full sm:w-auto shrink-0 flex justify-end">
                <select
                    value={activeSort}
                    onChange={(e) => updateFilter('sort', e.target.value)}
                    className="w-full sm:w-auto bg-card border border-border rounded-md px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-accent appearance-none cursor-pointer"
                >
                    <option value="biggest-drop">Sort by: Biggest $ Drop</option>
                    <option value="biggest-percent">Sort by: Biggest % Drop</option>
                    <option value="recent">Sort by: Recently Listed</option>
                </select>
            </div>

        </div>
    )
}
