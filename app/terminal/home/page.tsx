import { terminalPageMeta } from "@/lib/terminal-metadata"
import { GlobeSection } from "@/components/terminal/globe-section"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Explore Markets",
    description: "Interactive globe — explore real estate data by country, city, and community.",
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
          Select a market on the globe or click a city below. Drill down to community and building level.
        </p>
      </div>

      <GlobeSection />
    </div>
  )
}
