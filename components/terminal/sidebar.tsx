"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Calculator,
  Compass,
  FileText,
  Home,
  LayoutDashboard,
  Map,
  Newspaper,
  Percent,
  Settings,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"

export const sidebarLinks = [
  {
    title: "Terminal",
    links: [
      { label: "City Intelligence", href: "/terminal", icon: LayoutDashboard },
      { label: "Distress Deals", href: "/terminal/distress-deals", icon: BarChart3 },
      // { label: "Rental Drops", href: "/terminal/rental-drops", icon: Home },
    ]
  },
  {
    title: "Intelligence",
    links: [
      { label: "Community Screener", href: "/terminal/communities", icon: Map },
      // { label: "Price Index", href: "/terminal/price-index", icon: TrendingUp },
      // { label: "Supply Pipeline", href: "/terminal/supply-pipeline", icon: BarChart3 },
      // { label: "Service Charges", href: "/terminal/service-charges", icon: FileText },
      { label: "Building Comparator", href: "/terminal/building-comparator", icon: Building2 },
      // { label: "Developer Track", href: "/terminal/developer-track", icon: Users },
      // { label: "Off-Plan Pipeline", href: "/terminal/off-plan-pipeline", icon: Building2 },
      // { label: "Market Briefing", href: "/terminal/market-briefing", icon: Newspaper },
      // { label: "Yield Decay", href: "/terminal/rental-yield-decay", icon: TrendingDown }, // hidden — insufficient data
      // { label: "Project Screener", href: "/investor-terminal/screener", icon: Compass },
      // { label: "Investment Theses", href: "/investor-terminal/theses", icon: FileText },
    ]
  },
  {
    title: "Tools",
    links: [
      { label: "ROI Engine", href: "/terminal/roi-engine", icon: Calculator },
      { label: "Mortgage Calculator", href: "/terminal/mortgage-calculator", icon: Calculator },
      { label: "Rental Yield", href: "/terminal/rental-yield", icon: Percent },
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

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      <div className="flex h-16 items-center px-6 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2" onClick={onNavigate}>
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
                      onClick={onNavigate}
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
    </div>
  )
}

export function InvestorSidebar() {
  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-border bg-card lg:flex">
      <SidebarContent />
    </aside>
  )
}
