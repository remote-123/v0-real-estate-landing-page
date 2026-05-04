"use client"

import { useRef, useState } from "react"
import { MapPin, Clock, X, ChevronRight } from "lucide-react"
import Link from "next/link"
import { GlobeExplorer, type GlobeExplorerHandle } from "./globe-explorer"
import { getAreaDescription } from "@/lib/area-descriptions"

const MARKETS = [
  { city: "Dubai", flag: "🇦🇪", country: "United Arab Emirates", active: true, lat: 25.15, lng: 55.25, label: "16 areas · DLD data" },
  { city: "London", flag: "🇬🇧", country: "United Kingdom", active: false, lat: 51.51, lng: -0.12, label: null },
  { city: "Toronto", flag: "🇨🇦", country: "Canada", active: false, lat: 43.65, lng: -79.38, label: null },
  { city: "Singapore", flag: "🇸🇬", country: "Singapore", active: false, lat: 1.35, lng: 103.82, label: null },
  { city: "New York", flag: "🇺🇸", country: "United States", active: false, lat: 40.71, lng: -74.0, label: null },
]

export function GlobeSection() {
  const globeRef = useRef<GlobeExplorerHandle>(null)
  const [selectedCommunity, setSelectedCommunity] = useState<{ name: string; slug: string } | null>(null)

  return (
    <>
      {/* Globe */}
      <div className="w-full h-[560px] lg:h-[640px]">
        <GlobeExplorer ref={globeRef} onCommunitySelect={setSelectedCommunity} />
      </div>

      {/* Community panel — shown when a teal dot is clicked */}
      {selectedCommunity && (() => {
        const desc = getAreaDescription(selectedCommunity.name)
        const imgQuery = encodeURIComponent(selectedCommunity.name + " Dubai aerial")
        return (
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-400">
            {/* Hero image */}
            <div className="relative h-48 sm:h-60 w-full overflow-hidden bg-[#050a0f]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://source.unsplash.com/featured/1200x500/?${imgQuery}`}
                alt={selectedCommunity.name}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050a0f] via-[#050a0f]/40 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#00BFA5] mb-1">Community</p>
                <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">{selectedCommunity.name}</h2>
              </div>
              <button
                onClick={() => setSelectedCommunity(null)}
                className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-[#050a0f]/70 text-white/70 hover:text-white transition-colors backdrop-blur-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* Description + CTA */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end gap-4">
              <p className="flex-1 text-sm text-muted-foreground leading-relaxed">
                {desc ?? `${selectedCommunity.name} is a residential and commercial community in Dubai.`}
              </p>
              <Link
                href={`/terminal/communities/${selectedCommunity.slug}`}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-[#00BFA5]/40 bg-[#00BFA5]/10 px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-[#00BFA5] hover:bg-[#00BFA5]/20 transition-colors"
              >
                Full Analysis <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )
      })()}

      {/* City cards — hidden when a community is selected */}
      {!selectedCommunity && <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {MARKETS.map(m => (
          <button
            key={m.city}
            onClick={() => globeRef.current?.zoomToCity(m.lat, m.lng, m.active)}
            className={`rounded-xl border p-4 flex flex-col gap-2 text-left transition-all ${
              m.active
                ? "border-[#00BFA5]/40 bg-[#00BFA5]/8 hover:bg-[#00BFA5]/12 hover:border-[#00BFA5]/60 cursor-pointer active:scale-[0.97]"
                : "border-border/30 bg-card/20 opacity-50 cursor-default"
            } ${m.active ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">{m.flag}</span>
              {m.active ? (
                <div className="flex items-center gap-1 rounded px-1.5 py-0.5 bg-[#00BFA5]/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#00BFA5] animate-pulse" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#00BFA5]">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 rounded px-1.5 py-0.5 bg-secondary/50">
                  <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50">Soon</span>
                </div>
              )}
            </div>
            <div>
              <p className={`font-semibold ${m.active ? "text-foreground text-base sm:text-sm" : "text-foreground/60 text-sm"}`}>{m.city}</p>
              <p className={`text-[10px] ${m.active ? "text-muted-foreground" : "text-muted-foreground/50"}`}>{m.country}</p>
            </div>
            {m.active && m.label && (
              <div className="flex items-center gap-1 text-[9px] text-[#00BFA5] font-mono uppercase tracking-wider">
                <MapPin className="h-2.5 w-2.5" />
                {m.label}
              </div>
            )}
          </button>
        ))}
      </div>}
    </>
  )
}
