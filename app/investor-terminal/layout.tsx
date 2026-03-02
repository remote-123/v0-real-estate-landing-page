import React from "react"
import { InvestorSidebar } from "@/components/investor-terminal/sidebar"

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
                            {/* Header actions can go here */}
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] uppercase tracking-tighter text-muted-foreground">Market Open</span>
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
