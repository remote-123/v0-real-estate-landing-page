"use client"

import { useRef } from "react"
import { MapPin, Clock } from "lucide-react"
import { GlobeExplorer, type GlobeExplorerHandle } from "./globe-explorer"

const MARKETS = [
  { city: "Dubai", flag: "🇦🇪", country: "United Arab Emirates", active: true, lat: 25.15, lng: 55.25, label: "16 areas · DLD data" },
  { city: "London", flag: "🇬🇧", country: "United Kingdom", active: false, lat: 51.51, lng: -0.12, label: null },
  { city: "Toronto", flag: "🇨🇦", country: "Canada", active: false, lat: 43.65, lng: -79.38, label: null },
  { city: "Singapore", flag: "🇸🇬", country: "Singapore", active: false, lat: 1.35, lng: 103.82, label: null },
  { city: "New York", flag: "🇺🇸", country: "United States", active: false, lat: 40.71, lng: -74.0, label: null },
]

export function GlobeSection() {
  const globeRef = useRef<GlobeExplorerHandle>(null)

  return (
    <>
      {/* Globe */}
      <div className="w-full h-[560px] lg:h-[640px]">
        <GlobeExplorer ref={globeRef} />
      </div>

      {/* City cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
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
      </div>
    </>
  )
}
