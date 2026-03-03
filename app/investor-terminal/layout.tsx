import React from "react"
import Link from "next/link"
import { Calendar } from "lucide-react"
import { InvestorSidebar } from "@/components/investor-terminal/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { SITE_CONFIG } from "@/lib/constants"

export default function InvestorTerminalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <InvestorSidebar />
            <main className="lg:pl-64 flex flex-col min-h-screen">
                <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/50 bg-background/80 backdrop-blur-md px-6 lg:px-8">
                    <div className="flex flex-1 items-center justify-between">
                        <h1 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                            Investor Terminal <span className="mx-2 opacity-30">/</span> <span className="text-foreground">v1.0.4</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            {/* Header actions */}
                            <Button asChild variant="outline" size="sm" className="hidden sm:flex gap-2 border-accent/20 hover:bg-accent/10 hover:text-accent transition-colors">
                                <Link href={SITE_CONFIG.calendarLink} target="_blank">
                                    <Calendar className="h-3 w-3" />
                                    Schedule ROI Briefing
                                </Link>
                            </Button>
                            <ThemeToggle />
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="text-[10px] uppercase tracking-tighter text-muted-foreground font-medium">Market Open</span>
                            </div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 p-6 lg:p-8">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
