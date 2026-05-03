import { terminalPageMeta } from "@/lib/terminal-metadata"
import { GlobeExplorer } from "@/components/terminal/globe-explorer"
import { MapPin, Clock } from "lucide-react"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Explore Markets",
    description: "Interactive globe — explore real estate data by country, city, and community.",
    path: "/terminal/home",
  })
}

const COMING_SOON = [
  { city: "London", flag: "🇬🇧", country: "United Kingdom" },
  { city: "Toronto", flag: "🇨🇦", country: "Canada" },
  { city: "Singapore", flag: "🇸🇬", country: "Singapore" },
  { city: "New York", flag: "🇺🇸", country: "United States" },
]

export default function GlobePage() {
  return (
    <div className="flex flex-col gap-6 pb-24 lg:pb-10 px-4 sm:px-0 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Explorer</p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Explore Markets</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Select a market on the globe. Drill down to city, community, and individual building level.
        </p>
      </div>

      {/* Globe — full width, tall */}
      <div className="w-full h-[560px] lg:h-[640px]">
        <GlobeExplorer />
      </div>

      {/* Active vs Coming Soon markets */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* Active: Dubai */}
        <div className="rounded-xl border border-[#00BFA533] bg-[#00BFA5]/5 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-lg">🇦🇪</span>
            <div className="flex items-center gap-1 rounded px-1.5 py-0.5 bg-[#00BFA5]/20">
              <div className="h-1.5 w-1.5 rounded-full bg-[#00BFA5] animate-pulse" />
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#00BFA5]">Live</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Dubai</p>
            <p className="text-[10px] text-muted-foreground">United Arab Emirates</p>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-[#00BFA5] font-mono uppercase tracking-wider">
            <MapPin className="h-2.5 w-2.5" />
            16 areas · DLD data
          </div>
        </div>

        {/* Coming soon */}
        {COMING_SOON.map(m => (
          <div key={m.city} className="rounded-xl border border-border/30 bg-card/20 p-4 flex flex-col gap-2 opacity-50">
            <div className="flex items-center justify-between">
              <span className="text-lg">{m.flag}</span>
              <div className="flex items-center gap-1 rounded px-1.5 py-0.5 bg-secondary/50">
                <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50">Soon</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/60">{m.city}</p>
              <p className="text-[10px] text-muted-foreground/50">{m.country}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
