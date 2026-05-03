"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl"

// Dubai communities — same as globe
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

const ACCENT = "#00BFA5"
const BG = "#050a0f"

// Overpass query — Dubai motorways + trunk roads
const OVERPASS_QUERY = `[out:json][timeout:20];(way["highway"~"motorway|trunk"](24.7,54.8,25.5,55.6););out geom;`

async function fetchHighways(): Promise<GeoJSON.FeatureCollection | null> {
  try {
    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(OVERPASS_QUERY)}`,
      { signal: AbortSignal.timeout(15000) }
    )
    if (!res.ok) return null
    const data = await res.json()

    const features: GeoJSON.Feature[] = (data.elements ?? [])
      .filter((el: any) => el.type === "way" && el.geometry)
      .map((el: any) => ({
        type: "Feature" as const,
        properties: { name: el.tags?.name ?? "", highway: el.tags?.highway ?? "" },
        geometry: {
          type: "LineString" as const,
          coordinates: el.geometry.map((pt: any) => [pt.lon, pt.lat]),
        },
      }))

    return { type: "FeatureCollection", features }
  } catch {
    return null
  }
}

interface DubaiMapProps {
  onBack: () => void
}

export function DubaiMap({ onBack }: DubaiMapProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let map: MapLibreMap

    // Dynamically import maplibre-gl to avoid SSR issues
    import("maplibre-gl").then(({ Map, NavigationControl, Popup }) => {
      map = new Map({
        container: containerRef.current!,
        style: {
          version: 8,
          sources: {
            carto: {
              type: "raster",
              tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"],
              tileSize: 256,
              attribution: "© CARTO © OpenStreetMap contributors",
              maxzoom: 19,
            },
          },
          layers: [{ id: "carto-tiles", type: "raster", source: "carto" }],
        },
        center: [55.25, 25.13],
        zoom: 10.5,
        minZoom: 8,
        maxZoom: 16,
        attributionControl: false,
      })

      mapRef.current = map

      map.addControl(new NavigationControl({ showCompass: false }), "bottom-right")

      map.on("load", async () => {
        // Add community markers as GeoJSON circles
        const communityGeoJSON: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: DUBAI_AREAS.map(a => ({
            type: "Feature",
            properties: { name: a.name, slug: a.slug },
            geometry: { type: "Point", coordinates: [a.lng, a.lat] },
          })),
        }

        map.addSource("communities", { type: "geojson", data: communityGeoJSON })

        // Outer glow ring
        map.addLayer({
          id: "community-glow",
          type: "circle",
          source: "communities",
          paint: {
            "circle-radius": 18,
            "circle-color": ACCENT,
            "circle-opacity": 0.08,
            "circle-blur": 1,
          },
        })

        // Inner dot
        map.addLayer({
          id: "community-dot",
          type: "circle",
          source: "communities",
          paint: {
            "circle-radius": 5,
            "circle-color": ACCENT,
            "circle-opacity": 0.9,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": BG,
          },
        })

        // Labels
        map.addLayer({
          id: "community-label",
          type: "symbol",
          source: "communities",
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["literal", ["Open Sans Regular"]],
            "text-size": 10,
            "text-offset": [0, 1.8],
            "text-anchor": "top",
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#e2e8f0",
            "text-halo-color": BG,
            "text-halo-width": 1.5,
          },
        })

        // Hover cursor
        map.on("mouseenter", "community-dot", () => {
          map.getCanvas().style.cursor = "pointer"
          map.setPaintProperty("community-dot", "circle-color", "#ffffff")
          map.setPaintProperty("community-glow", "circle-opacity", 0.18)
        })
        map.on("mouseleave", "community-dot", () => {
          map.getCanvas().style.cursor = ""
          map.setPaintProperty("community-dot", "circle-color", ACCENT)
          map.setPaintProperty("community-glow", "circle-opacity", 0.08)
        })

        // Click → navigate
        map.on("click", "community-dot", (e) => {
          const props = e.features?.[0]?.properties
          if (props?.slug) {
            router.push(`/terminal/communities/${props.slug}`)
          }
        })

        // Load highways async — non-blocking
        fetchHighways().then(highways => {
          if (!highways || !map.isStyleLoaded()) return
          try {
            map.addSource("highways", { type: "geojson", data: highways })
            // Glow
            map.addLayer({
              id: "highway-glow",
              type: "line",
              source: "highways",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: {
                "line-color": ACCENT,
                "line-width": 6,
                "line-opacity": 0.12,
                "line-blur": 4,
              },
            }, "community-glow") // insert below markers

            // Line
            map.addLayer({
              id: "highway-line",
              type: "line",
              source: "highways",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: {
                "line-color": ACCENT,
                "line-width": 1.5,
                "line-opacity": 0.55,
              },
            }, "community-glow")
          } catch {
            // fail silently if map was unmounted
          }
        })
      })
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [router])

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#050a0f]">
      {/* MapLibre CSS */}
      <style>{`
        .maplibregl-ctrl-group { background: #0d1f2d !important; border: 1px solid #00BFA533 !important; }
        .maplibregl-ctrl-group button { color: #00BFA5 !important; }
        .maplibregl-ctrl-group button:hover { background: #00BFA510 !important; }
        .maplibregl-ctrl-attrib { display: none; }
      `}</style>

      <div ref={containerRef} className="w-full h-full" />

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-md border border-[#00BFA533] bg-[#050a0f]/90 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[#00BFA5] hover:bg-[#00BFA5]/10 transition-colors backdrop-blur-sm"
      >
        ← Globe
      </button>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-[#00BFA533] bg-[#050a0f]/90 backdrop-blur-sm px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="h-[2px] w-5 rounded" style={{ background: ACCENT, opacity: 0.6 }} />
          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">Major Arteries</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: ACCENT }} />
          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">Communities · Click to explore</span>
        </div>
      </div>
    </div>
  )
}
