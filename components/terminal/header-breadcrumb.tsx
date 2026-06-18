"use client"

import { usePathname } from "next/navigation"
import { sidebarLinks } from "./sidebar"

const allLinks = sidebarLinks.flatMap((g) => g.links)

export function HeaderBreadcrumb() {
  const pathname = usePathname()
  const match = allLinks.find((l) => l.href === pathname)
  const pageTitle = match?.label ?? "Terminal"

  return (
    <h1 className="hidden sm:flex text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-widest items-center gap-2">
      <span className="text-foreground font-semibold tracking-wider">Dubai Data Intelligence</span>
      <span className="mx-2 opacity-20">/</span>
      <span className="font-mono text-[10px] text-accent">{pageTitle}</span>
    </h1>
  )
}
