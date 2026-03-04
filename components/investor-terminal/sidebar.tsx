"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeft,
  BarChart3,
  Calculator,
  Compass,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"

const sidebarLinks = [
  {
    title: "Terminal",
    links: [
      { label: "Overview", href: "/investor-terminal", icon: LayoutDashboard },
      { label: "Distress Deals", href: "/investor-terminal/distress-deals", icon: BarChart3 },
    ]
  },
  {
    title: "Intelligence",
    links: [
      { label: "ROI Engine", href: "/investor-terminal/roi-engine", icon: Calculator },
      // { label: "Project Screener", href: "/investor-terminal/screener", icon: Compass },
      // { label: "Investment Theses", href: "/investor-terminal/theses", icon: FileText },
    ]
  },
  {
    title: "Support",
    links: [
      // { label: "Golden Visa", href: "/investor-terminal/golden-visa", icon: ShieldCheck },
      // { label: "Settings", href: "/investor-terminal/settings", icon: Settings },
    ]
  }
]

export function InvestorSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-16 items-center px-6 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-lg font-bold tracking-tight text-foreground">
            NORTH CAPITAL
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        {sidebarLinks.filter(g => g.links.length > 0).map((group) => (
          <div key={group.title} className="space-y-4">
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.links.map((link) => {
                const isActive = pathname === link.href
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <link.icon className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-accent-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border/50 mt-auto space-y-4">
        <div className="rounded-lg bg-secondary/50 p-4">
          <p className="text-xs font-medium text-foreground">Investor Status</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Verified Institutional</p>
          </div>
        </div>

        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-3 w-3" />
          Exit Terminal
        </Link>
      </div>
    </aside>
  )
}
