"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  Calculator,
  FileText,
  Home,
  LayoutDashboard,
  Map,
  Newspaper,
  Percent,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Landmark,
  Activity,
  GitCompare,
  Layers,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"

export const sidebarLinks = [
  {
    title: "Terminal",
    links: [
      { label: "City Intelligence", href: "/terminal", icon: LayoutDashboard },
      { label: "Distress Deals", href: "/terminal/distress-deals", icon: BarChart3 },
      { label: "Rental Drops", href: "/terminal/rental-drops", icon: Home },
      { label: "Market Pulse", href: "/terminal/market-pulse", icon: Activity },
      { label: "Transaction Pulse", href: "/terminal/transaction-pulse", icon: Activity },
      { label: "Comparable Sales", href: "/terminal/transaction-search", icon: Search },
      { label: "Market Briefing", href: "/terminal/market-briefing", icon: Newspaper },
    ]
  },
  {
    title: "Market Screeners",
    links: [
      { label: "Community Screener", href: "/terminal/communities", icon: Map },
      { label: "Yield Map", href: "/terminal/yield-map", icon: TrendingUp },
      { label: "Area Momentum", href: "/terminal/area-momentum", icon: TrendingUp },
      { label: "Floor Plan Pricer", href: "/terminal/floor-plan-pricer", icon: Layers },
      { label: "Off-Plan Pipeline", href: "/terminal/off-plan-pipeline", icon: Building2 },
      { label: "Service Charges", href: "/terminal/service-charges", icon: FileText },
      { label: "Mortgage & Liquidity", href: "/terminal/liquidity", icon: Landmark },
      { label: "Bear Case Screener", href: "/terminal/bear-cases", icon: AlertTriangle },
      { label: "Bull Case Screener", href: "/terminal/bull-cases", icon: TrendingUp },
    ]
  },
  {
    title: "Buildings & Developers",
    links: [
      { label: "Building Comparator", href: "/terminal/building-comparator", icon: Building2 },
      { label: "Unit Registry", href: "/terminal/unit-registry", icon: Layers },
      { label: "Buildings", href: "/terminal/buildings", icon: Building2 },
      { label: "Developer Track Record", href: "/terminal/developer-track", icon: Users },
      { label: "Area Comparison", href: "/terminal/compare", icon: GitCompare },
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
  const [isCityRegistry, setIsCityRegistry] = useState(false)
  useEffect(() => {
    setIsCityRegistry(window.location.hostname.includes("cityregistry"))
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex h-16 items-center px-6 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2" onClick={onNavigate}>
          <span className="font-serif text-lg font-bold tracking-tight text-foreground">
            {isCityRegistry ? "THE CITY REGISTRY" : "NORTH CAPITAL"}
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
        {isCityRegistry ? (
          <div className="rounded-lg p-4" style={{ background: 'rgba(0,191,165,0.06)', border: '1px solid rgba(0,191,165,0.15)' }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-mono font-semibold text-foreground uppercase tracking-widest">Data Status</p>
              <div className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold" style={{ background: '#00BFA5', color: '#000' }}>PRO</div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#00BFA5' }} />
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tight">DLD · Bayut · Live</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-secondary/50 p-4">
            <p className="text-xs font-medium text-foreground">Investor Status</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Verified Institutional</p>
            </div>
          </div>
        )}

        {!isCityRegistry && (
          <Link
            href="/services"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Site
          </Link>
        )}
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
