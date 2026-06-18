"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Building2,
  Calculator,
  Globe,
  Map,
  Percent,
  Search,
  TrendingUp,
  Users,
  Activity,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"

export const sidebarLinks = [
  {
    title: "Overview",
    links: [
      { label: "Explore Markets", href: "/terminal/home", icon: Globe },
      { label: "Transaction Pulse", href: "/terminal/transaction-pulse", icon: Activity },
    ]
  },
  {
    title: "Market Analysis",
    links: [
      { label: "Community Screener", href: "/terminal/communities", icon: Map },
      { label: "Area Momentum", href: "/terminal/area-momentum", icon: TrendingUp },
      { label: "Distress Deals", href: "/terminal/distress-deals", icon: BarChart3 },
      { label: "Off-Plan Pipeline", href: "/terminal/off-plan-pipeline", icon: Building2 },
    ]
  },
  {
    title: "Property Research",
    links: [
      { label: "Prop Buildings", href: "/terminal/prop-buildings", icon: Building2 },
      { label: "Building Comparator", href: "/terminal/building-comparator", icon: Building2 },
      { label: "Floor Plan Pricer", href: "/terminal/floor-plan-pricer", icon: Layers },
      { label: "Building Listings", href: "/terminal/building-listings", icon: Search },
      { label: "Comparable Sales", href: "/terminal/transaction-search", icon: Search },
      { label: "Developer Track Record", href: "/terminal/developer-track", icon: Users },
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
]

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      <div className="flex h-16 items-center px-6 border-b border-border/50">
        <Link href="/terminal" className="flex items-center gap-2" onClick={onNavigate}>
          <span className="font-serif text-lg font-bold tracking-tight text-foreground">
            North Capital DXB
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
