"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { DubaiMap } from "./dubai-map"

// Dubai communities with lat/lng for markers
const DUBAI_AREAS = [
  { name: "Downtown Dubai", slug: "downtown-dubai", lat: 25.1972, lng: 55.2744 },
  { name: "Dubai Marina", slug: "dubai-marina", lat: 25.0819, lng: 55.1367 },
  { name: "Business Bay", slug: "business-bay", lat: 25.1865, lng: 55.2633 },
  { name: "Palm Jumeirah", slug: "palm-jumeirah", lat: 25.1124, lng: 55.1390 },
  { name: "Jumeirah Village Circle", slug: "jumeirah-village-circle", lat: 25.0609, lng: 55.2005 },
  { name: "Dubai Hills Estate", slug: "dubai-hills-estate", lat: 25.1132, lng: 55.2286 },
  { name: "Arabian Ranches", slug: "arabian-ranches", lat: 25.0503, lng: 55.2693 },
  { name: "Damac Hills", slug: "damac-hills", lat: 25.0256, lng: 55.2298 },
  { name: "Al Barsha", slug: "al-barsha", lat: 25.1145, lng: 55.2001 },
  { name: "Deira", slug: "deira", lat: 25.2769, lng: 55.3273 },
  { name: "Bur Dubai", slug: "bur-dubai", lat: 25.2581, lng: 55.2989 },
  { name: "Dubai Creek Harbour", slug: "dubai-creek-harbour", lat: 25.2083, lng: 55.3524 },
  { name: "DIFC", slug: "difc", lat: 25.2124, lng: 55.2798 },
  { name: "Jumeirah Lake Towers", slug: "jumeirah-lake-towers", lat: 25.0714, lng: 55.1454 },
  { name: "Meydan", slug: "meydan", lat: 25.1612, lng: 55.3024 },
  { name: "Sobha Hartland", slug: "sobha-hartland", lat: 25.1916, lng: 55.3401 },
]

// Countries with support status
const COUNTRIES = [
  { name: "UAE", lat: 24.47, lng: 54.37, active: true, city: "Dubai", label: "Active" },
  { name: "United Kingdom", lat: 51.51, lng: -0.12, active: false, city: "London", label: "Soon" },
  { name: "Canada", lat: 43.65, lng: -79.38, active: false, city: "Toronto", label: "Soon" },
  { name: "Singapore", lat: 1.35, lng: 103.82, active: false, city: "Singapore", label: "Soon" },
  { name: "USA", lat: 40.71, lng: -74.0, active: false, city: "New York", label: "Soon" },
]

type Stage = "globe" | "city"
type AreaMarker = typeof DUBAI_AREAS[0]

// SSR-safe dynamic import
const GlobeGL = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">Initializing globe…</div>
    </div>
  ),
})

export function GlobeExplorer() {
  const router = useRouter()
  const globeRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<Stage>("globe")
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [hoveredArea, setHoveredArea] = useState<AreaMarker | null>(null)
  const [ready, setReady] = useState(false)
  const [currentAltitude, setCurrentAltitude] = useState(2.2)

  // Responsive sizing
  useEffect(() => {
    const obs = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const handleGlobeReady = useCallback(() => {
    setReady(true)
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 25.2, lng: 55.27, altitude: 2.2 }, 1200)
      globeRef.current.controls().autoRotate = true
      globeRef.current.controls().autoRotateSpeed = 0.3
      globeRef.current.controls().enableZoom = true
      globeRef.current.controls().minDistance = 101  // ~0.01 altitude
      globeRef.current.controls().maxDistance = 800  // ~2.5 altitude
      // Track altitude changes from user scroll/pinch
      globeRef.current.controls().addEventListener("change", () => {
        const pov = globeRef.current?.pointOfView()
        if (pov?.altitude !== undefined) setCurrentAltitude(pov.altitude)
      })
    }
  }, [])

  const handleCountryClick = useCallback((d: any) => {
    if (!d.active) return
    // Stop auto-rotate, zoom tight into Dubai
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = false
      globeRef.current.pointOfView({ lat: 25.15, lng: 55.25, altitude: 0.12 }, 1400)
      setCurrentAltitude(0.12)
    }
    setTimeout(() => setStage("city"), 1500)
  }, [])

  const handleZoom = useCallback((direction: "in" | "out") => {
    if (!globeRef.current) return
    const pov = globeRef.current.pointOfView()
    const current = pov.altitude ?? currentAltitude
    const next = direction === "in"
      ? Math.max(0.04, current * 0.6)
      : Math.min(3.0, current * 1.6)
    globeRef.current.pointOfView({ ...pov, altitude: next }, 400)
    setCurrentAltitude(next)
  }, [currentAltitude])

  const handleAreaClick = useCallback((area: AreaMarker) => {
    router.push(`/terminal/communities/${area.slug}`)
  }, [router])

  const handleBack = useCallback(() => {
    setStage("globe")
    setCurrentAltitude(2.2)
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 25.2, lng: 55.27, altitude: 2.2 }, 1000)
      globeRef.current.controls().autoRotate = true
      globeRef.current.controls().autoRotateSpeed = 0.3
    }
  }, [])

  // Globe point data — countries
  const countryPoints = COUNTRIES.map(c => ({
    ...c,
    color: c.active ? "#00BFA5" : "#ffffff22",
    size: c.active ? 0.6 : 0.35,
  }))

  // City stage markers — Dubai areas
  const areaPoints = DUBAI_AREAS.map(a => ({
    ...a,
    color: hoveredArea?.slug === a.slug ? "#00BFA5" : "#00BFA566",
    size: hoveredArea?.slug === a.slug ? 0.55 : 0.35,
  }))

  const currentPoints = stage === "globe" ? countryPoints : areaPoints

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[520px] overflow-hidden rounded-xl bg-[#050a0f]">
      {/* Globe */}
      <GlobeGL
        ref={globeRef}
        width={size.w}
        height={size.h}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl={null as any}
        backgroundColor="#050a0f"
        showAtmosphere={true}
        atmosphereColor="#00BFA5"
        atmosphereAltitude={0.12}
        pointsData={currentPoints}
        pointColor="color"
        pointAltitude={0.01}
        pointRadius="size"
        pointResolution={8}
        pointLabel={(d: any) => stage === "globe"
          ? `<div style="background:#0d1f2d;border:1px solid #00BFA533;padding:6px 10px;border-radius:6px;font-size:11px;font-family:monospace;color:#e2e8f0">
              <strong style="color:${d.active ? "#00BFA5" : "#64748b"}">${d.city}</strong>
              <span style="color:#475569;margin-left:8px;font-size:9px;text-transform:uppercase;letter-spacing:0.1em">${d.label}</span>
             </div>`
          : `<div style="background:#0d1f2d;border:1px solid #00BFA533;padding:6px 10px;border-radius:6px;font-size:11px;font-family:monospace;color:#e2e8f0">${d.name}</div>`
        }
        onPointClick={stage === "globe"
          ? handleCountryClick
          : (d: any) => handleAreaClick(d as AreaMarker)
        }
        onPointHover={stage === "city" ? (d: any) => setHoveredArea(d as AreaMarker | null) : undefined}
        onGlobeReady={handleGlobeReady}
      />

      {/* Overlay: globe stage instructions */}
      {stage === "globe" && ready && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-2 rounded-full border border-[#00BFA533] bg-[#050a0f]/80 px-4 py-2 backdrop-blur-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-[#00BFA5] animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#00BFA5]">Click UAE to explore Dubai</span>
          </div>
        </div>
      )}

      {/* City stage — MapLibre Dubai map overlaid on globe with fade-in */}
      {stage === "city" && (
        <div className="absolute inset-0 animate-in fade-in duration-500">
          <DubaiMap onBack={handleBack} />
        </div>
      )}

      {/* Zoom controls — globe stage only */}
      {stage === "globe" && ready && (
        <div className="absolute bottom-6 right-4 flex flex-col gap-1">
          <button
            onClick={() => handleZoom("in")}
            className="flex h-8 w-8 items-center justify-center rounded border border-[#00BFA533] bg-[#050a0f]/90 text-[#00BFA5] hover:bg-[#00BFA5]/10 transition-colors backdrop-blur-sm text-base font-mono leading-none"
            aria-label="Zoom in"
          >+</button>
          <button
            onClick={() => handleZoom("out")}
            className="flex h-8 w-8 items-center justify-center rounded border border-[#00BFA533] bg-[#050a0f]/90 text-[#00BFA5] hover:bg-[#00BFA5]/10 transition-colors backdrop-blur-sm text-base font-mono leading-none"
            aria-label="Zoom out"
          >−</button>
        </div>
      )}
    </div>
  )
}
