import { terminalPageMeta } from "@/lib/terminal-metadata"
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Building Comparator — Side-by-Side PSF Analysis",
    description: "Compare Dubai buildings side-by-side: price per sqft trends, service charge rates, quarterly transaction volumes, and metro proximity. Data from DLD registered sales.",
    path: "/terminal/building-comparator",
  })
}

export default function BuildingComparatorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
