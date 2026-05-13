import { terminalPageMeta } from "@/lib/terminal-metadata"
import { CommunityGrid } from "@/components/terminal/community-grid"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Explore Markets",
    description: "Browse Dubai communities and drill down to building-level data.",
    path: "/terminal/home",
  })
}

export default function GlobePage() {
  return (
    <div className="flex flex-col gap-6 pb-24 lg:pb-10 px-4 sm:px-0 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Explorer</p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Explore Markets</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Browse Dubai communities. Drill down to community and building level.
        </p>
      </div>

      <CommunityGrid />
    </div>
  )
}
