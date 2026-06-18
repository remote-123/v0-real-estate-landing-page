"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
    LogOut,
    Menu,
    X,
    ChevronRight,
    Settings2,
    Activity,
    Users,
    Building2,
    Map,
    Landmark,
    FlaskConical,
    Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
    {
        group: "System",
        items: [
            { label: "Health", href: "/admin/dashboard", icon: Activity, description: "DB stats, leads, cron activity" },
            { label: "Users", href: "/admin/users", icon: Users, description: "Registered users & sign-in analytics" },
        ],
    },
    {
        group: "Data",
        items: [
            { label: "Buildings", href: "/admin/buildings", icon: Building2, description: "Review & clean building records" },
            { label: "Area Mapping", href: "/admin/areas", icon: Map, description: "Bayut → DLD area name bridge" },
            { label: "Projects", href: "/admin/projects", icon: Landmark, description: "Developer names & completion dates" },
        ],
    },
    {
        group: "Automations",
        items: [
            { label: "Overview", href: "/admin/automations", icon: Zap, description: "All crons & automations" },
            { label: "Researcher", href: "/admin/automations/researcher", icon: FlaskConical, description: "Automated research tasks" },
        ],
    },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        await fetch("/api/admin/logout", { method: "POST" })
        router.push("/admin/login")
    }

    return (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 px-6 border-b border-border/50 shrink-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 border border-accent/20">
                    <Settings2 className="h-3.5 w-3.5 text-accent" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-foreground leading-none">Admin</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest">North Capital DXB</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
                {navItems.map((group) => (
                    <div key={group.group}>
                        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 px-2 mb-2">
                            {group.group}
                        </p>
                        <ul className="space-y-1">
                            {group.items.map((item) => {
                                const Icon = item.icon
                                const active = pathname === item.href
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={onNavigate}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors group",
                                                active
                                                    ? "bg-accent/10 text-accent font-medium"
                                                    : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
                                            )}
                                        >
                                            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-accent" : "text-muted-foreground group-hover:text-foreground")} />
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate">{item.label}</p>
                                                <p className="text-[10px] text-muted-foreground/60 truncate font-normal">{item.description}</p>
                                            </div>
                                            {active && <ChevronRight className="h-3 w-3 text-accent/60 shrink-0" />}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Logout */}
            <div className="px-4 py-4 border-t border-border/50 shrink-0">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign out
                </button>
            </div>
        </div>
    )
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Desktop sidebar */}
            <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col border-r border-border/50 bg-card/30">
                <SidebarContent />
            </aside>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile drawer */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border/50 bg-card transition-transform duration-200 lg:hidden",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </aside>

            {/* Main content */}
            <main className="lg:pl-64 flex flex-col min-h-screen">
                {/* Header */}
                <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/50 bg-background/80 backdrop-blur-md px-4 lg:px-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden mr-2"
                        onClick={() => setMobileOpen((v) => !v)}
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                        Admin Panel
                    </span>
                </header>

                <div className="flex-1 p-6 lg:p-10">
                    <div className="mx-auto max-w-3xl">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
