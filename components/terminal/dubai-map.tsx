"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl"
import DISTRICT_GEOJSON from "@/lib/area-data/dubai-districts"

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

// Static Dubai highway polylines — instant, no API dependency
// Approximate coordinates for the 5 major arteries
const STATIC_HIGHWAYS: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      // Sheikh Zayed Road (E11) — main coastal spine
      type: "Feature",
      properties: { name: "Sheikh Zayed Road (E11)" },
      geometry: {
        type: "LineString",
        coordinates: [
          [55.0612, 25.0260], [55.0890, 25.0478], [55.1152, 25.0628],
          [55.1367, 25.0819], [55.1540, 25.0970], [55.1720, 25.1100],
          [55.1900, 25.1230], [55.2100, 25.1380], [55.2350, 25.1620],
          [55.2540, 25.1830], [55.2720, 25.2000], [55.2900, 25.2200],
          [55.3100, 25.2450], [55.3270, 25.2680],
        ],
      },
    },
    {
      // E311 (Sheikh Mohammed Bin Zayed Road) — inland parallel
      type: "Feature",
      properties: { name: "E311 Sheikh Mohammed Bin Zayed Road" },
      geometry: {
        type: "LineString",
        coordinates: [
          [55.1200, 24.9900], [55.1450, 25.0150], [55.1700, 25.0400],
          [55.1950, 25.0700], [55.2150, 25.0950], [55.2400, 25.1200],
          [55.2650, 25.1500], [55.2900, 25.1800], [55.3100, 25.2000],
          [55.3350, 25.2250], [55.3600, 25.2500], [55.3850, 25.2700],
          [55.4100, 25.2900],
        ],
      },
    },
    {
      // Al Khail Road (D68)
      type: "Feature",
      properties: { name: "Al Khail Road" },
      geometry: {
        type: "LineString",
        coordinates: [
          [55.1600, 25.0050], [55.1800, 25.0300], [55.2000, 25.0600],
          [55.2150, 25.0900], [55.2300, 25.1200], [55.2450, 25.1500],
          [55.2600, 25.1800], [55.2750, 25.2100], [55.2900, 25.2400],
          [55.3050, 25.2700],
        ],
      },
    },
    {
      // Emirates Road (E611)
      type: "Feature",
      properties: { name: "Emirates Road (E611)" },
      geometry: {
        type: "LineString",
        coordinates: [
          [55.2900, 24.9600], [55.3100, 24.9900], [55.3300, 25.0200],
          [55.3500, 25.0600], [55.3700, 25.1000], [55.3900, 25.1400],
          [55.4100, 25.1800], [55.4250, 25.2200], [55.4400, 25.2600],
          [55.4550, 25.3000],
        ],
      },
    },
    {
      // Dubai-Al Ain Road (E66)
      type: "Feature",
      properties: { name: "Dubai–Al Ain Road (E66)" },
      geometry: {
        type: "LineString",
        coordinates: [
          [55.2400, 25.1600], [55.2700, 25.1350], [55.3000, 25.1100],
          [55.3300, 25.0850], [55.3600, 25.0600], [55.3900, 25.0350],
          [55.4200, 25.0100],
        ],
      },
    },
  ],
}

// Overpass query — Dubai motorways + trunk roads (async enhancement)
const OVERPASS_QUERY = `[out:json][timeout:20];(way["highway"~"motorway|trunk"](24.7,54.8,25.5,55.6););out geom;`

async function fetchHighwaysFromOverpass(): Promise<GeoJSON.FeatureCollection | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(OVERPASS_QUERY)}`,
      { signal: controller.signal }
    )
    clearTimeout(timer)
    if (!res.ok) return null
    const data = await res.json()
    const features: GeoJSON.Feature[] = (data.elements ?? [])
      .filter((el: any) => el.type === "way" && el.geometry?.length > 1)
      .map((el: any) => ({
        type: "Feature" as const,
        properties: { name: el.tags?.name ?? "" },
        geometry: {
          type: "LineString" as const,
          coordinates: el.geometry.map((pt: any) => [pt.lon, pt.lat]),
        },
      }))
    return features.length > 0 ? { type: "FeatureCollection", features } : null
  } catch {
    return null
  }
}

const DISTRICT_COLOR = "#f59e0b"  // amber — distinct from highway green

interface DubaiMapProps {
  onBack: () => void
  onCommunitySelect?: (area: { name: string; slug: string }) => void
}

// Radius (degrees) for showing nearby community dots when a district is zoomed in
const COMMUNITY_RADIUS = 0.08 // ~8km

export function DubaiMap({ onBack, onCommunitySelect }: DubaiMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  // "city" = overview (districts only), "district" = zoomed into a district (communities visible)
  const [mapLevel, setMapLevel] = useState<"city" | "district">("city")
  const [activeDistrict, setActiveDistrict] = useState<{ slug: string; name: string } | null>(null)

  const showCommunityLayers = (visible: boolean, map: MapLibreMap) => {
    const vis = visible ? "visible" : "none"
    try {
      map.setLayoutProperty("community-glow", "visibility", vis)
      map.setLayoutProperty("community-dot", "visibility", vis)
      map.setLayoutProperty("community-label", "visibility", vis)
    } catch { /* layers may not exist yet */ }
  }

  const handleDistrictClick = (slug: string, name: string) => {
    const map = mapRef.current
    if (!map) return
    const area = DUBAI_AREAS.find(a => a.slug === slug)
    const center: [number, number] = area ? [area.lng, area.lat] : [55.25, 25.13]

    // Filter community dots to those within radius of this district center
    const nearbySlug = DUBAI_AREAS
      .filter(a => {
        const dlat = a.lat - center[1]
        const dlng = a.lng - center[0]
        return Math.sqrt(dlat * dlat + dlng * dlng) <= COMMUNITY_RADIUS
      })
      .map(a => a.slug)

    try {
      // If no nearby communities in radius, show the district itself as a dot
      const slugsToShow = nearbySlug.length > 0 ? nearbySlug : [slug]
      const filter: any = ["in", ["get", "slug"], ["literal", slugsToShow]]
      map.setFilter("community-glow", filter)
      map.setFilter("community-dot", filter)
      map.setFilter("community-label", filter)
    } catch { /* ignore */ }

    showCommunityLayers(true, map)
    map.flyTo({ center, zoom: 14, duration: 1200 })
    setMapLevel("district")
    setActiveDistrict({ slug, name })
  }

  const handleBackToCity = () => {
    const map = mapRef.current
    if (!map) return
    try {
      map.setFilter("community-glow", null)
      map.setFilter("community-dot", null)
      map.setFilter("community-label", null)
    } catch { /* ignore */ }
    showCommunityLayers(false, map)
    map.flyTo({ center: [55.25, 25.13], zoom: 10.5, duration: 1000 })
    setMapLevel("city")
    setActiveDistrict(null)
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let map: MapLibreMap

    import("maplibre-gl").then(({ Map, NavigationControl }) => {
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
        maxZoom: 18,
        attributionControl: false,
      })

      mapRef.current = map
      map.addControl(new NavigationControl({ showCompass: false }), "bottom-right")

      map.on("load", async () => {
        // Community GeoJSON — hidden at city level, revealed on district click
        const communityGeoJSON: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: DUBAI_AREAS.map(a => ({
            type: "Feature",
            properties: { name: a.name, slug: a.slug },
            geometry: { type: "Point", coordinates: [a.lng, a.lat] },
          })),
        }

        map.addSource("communities", { type: "geojson", data: communityGeoJSON })

        // Outer glow — hidden by default
        map.addLayer({
          id: "community-glow",
          type: "circle",
          source: "communities",
          layout: { visibility: "none" },
          paint: {
            "circle-radius": 18,
            "circle-color": ACCENT,
            "circle-opacity": 0.08,
            "circle-blur": 1,
          },
        })

        // Inner dot — hidden by default
        map.addLayer({
          id: "community-dot",
          type: "circle",
          source: "communities",
          layout: { visibility: "none" },
          paint: {
            "circle-radius": 6,
            "circle-color": ACCENT,
            "circle-opacity": 0.95,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": BG,
          },
        })

        // Labels — hidden by default
        map.addLayer({
          id: "community-label",
          type: "symbol",
          source: "communities",
          layout: {
            visibility: "none",
            "text-field": ["get", "name"],
            "text-font": ["literal", ["Open Sans Regular"]],
            "text-size": 11,
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

        map.on("click", "community-dot", (e) => {
          const props = e.features?.[0]?.properties
          if (props?.slug) onCommunitySelect?.({ name: props.name ?? props.slug, slug: props.slug })
        })

        // Highways
        const addHighwayLayers = (data: GeoJSON.FeatureCollection) => {
          try {
            if (map.getSource("highways")) {
              ;(map.getSource("highways") as GeoJSONSource).setData(data)
              return
            }
            map.addSource("highways", { type: "geojson", data })
            map.addLayer({
              id: "highway-glow",
              type: "line",
              source: "highways",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": ACCENT, "line-width": 10, "line-opacity": 0.15, "line-blur": 6 },
            }, "community-glow")
            map.addLayer({
              id: "highway-line",
              type: "line",
              source: "highways",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": ACCENT, "line-width": 2, "line-opacity": 0.7 },
            }, "community-glow")
          } catch { /* ignore */ }
        }

        addHighwayLayers(STATIC_HIGHWAYS)
        fetchHighwaysFromOverpass().then(hw => { if (hw && mapRef.current) addHighwayLayers(hw) })

        // District polygons — show static immediately, upgrade with Overpass if available
        const addDistrictLayers = (data: GeoJSON.FeatureCollection) => {
          try {
            if (map.getSource("districts")) {
              ;(map.getSource("districts") as GeoJSONSource).setData(data)
              return
            }

            map.addSource("districts", { type: "geojson", data })

            map.addLayer({
              id: "district-fill",
              type: "fill",
              source: "districts",
              paint: { "fill-color": DISTRICT_COLOR, "fill-opacity": 0.06 },
            }, "highway-glow")

            map.addLayer({
              id: "district-border",
              type: "line",
              source: "districts",
              layout: { "line-join": "round" },
              paint: { "line-color": DISTRICT_COLOR, "line-width": 1.5, "line-opacity": 0.6 },
            }, "highway-glow")

            map.on("mouseenter", "district-fill", () => {
              map.getCanvas().style.cursor = "pointer"
              map.setPaintProperty("district-fill", "fill-opacity", 0.15)
            })
            map.on("mouseleave", "district-fill", () => {
              map.getCanvas().style.cursor = ""
              map.setPaintProperty("district-fill", "fill-opacity", 0.06)
            })

            // District click → zoom in + reveal communities
            map.on("click", "district-fill", (e) => {
              const props = e.features?.[0]?.properties
              if (props?.slug) {
                handleDistrictClick(props.slug, props.name ?? props.slug)
              }
            })
          } catch { /* ignore */ }
        }

        // Load district polygons from static Nominatim GeoJSON
        addDistrictLayers(DISTRICT_GEOJSON)
      })
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#050a0f]">
      <style>{`
        .maplibregl-ctrl-group { background: #0d1f2d !important; border: 1px solid #00BFA533 !important; }
        .maplibregl-ctrl-group button { color: #00BFA5 !important; }
        .maplibregl-ctrl-group button:hover { background: #00BFA510 !important; }
        .maplibregl-ctrl-attrib { display: none; }
      `}</style>

      <div ref={containerRef} className="w-full h-full" />

      {/* Breadcrumb nav — Globe / Dubai / [District] */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-md border border-[#00BFA533] bg-[#050a0f]/90 backdrop-blur-sm px-3 py-1.5">
        <button
          onClick={onBack}
          className="text-[10px] font-mono uppercase tracking-widest text-[#00BFA5] hover:text-white transition-colors"
        >
          Globe
        </button>
        <span className="text-[#ffffff20] text-[10px]">/</span>
        <button
          onClick={mapLevel === "district" ? handleBackToCity : undefined}
          className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${
            mapLevel === "district"
              ? "text-[#00BFA5] hover:text-white cursor-pointer"
              : "text-white cursor-default"
          }`}
        >
          Dubai
        </button>
        {activeDistrict && (
          <>
            <span className="text-[#ffffff20] text-[10px]">/</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-white truncate max-w-[120px]">
              {activeDistrict.name}
            </span>
          </>
        )}
      </div>

      {/* Level hint label */}
      <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-[#00BFA533] bg-[#050a0f]/90 backdrop-blur-sm px-3 py-2 flex flex-col gap-1.5">
          {mapLevel === "city" ? (
            <>
              <div className="flex items-center gap-2">
                <div className="h-[2px] w-5 rounded" style={{ background: ACCENT, opacity: 0.6 }} />
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">Major Arteries</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-4 rounded-sm border" style={{ borderColor: DISTRICT_COLOR, background: DISTRICT_COLOR + "22" }} />
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">Districts · Click to enter</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ background: ACCENT }} />
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">Communities · Click to explore</span>
            </div>
          )}
        </div>
    </div>
  )
}
