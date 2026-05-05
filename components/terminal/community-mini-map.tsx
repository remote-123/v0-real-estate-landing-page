"use client"

import { useEffect, useRef } from "react"
import dynamic from "next/dynamic"

interface CommunityMiniMapProps {
  lat: number
  lng: number
  name: string
}

function MiniMapInner({ lat, lng, name }: CommunityMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import("maplibre-gl").then(({ Map, Marker, NavigationControl }) => {
      const map = new Map({
        container: containerRef.current!,
        style: {
          version: 8,
          sources: {
            carto: {
              type: "raster",
              tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"],
              tileSize: 256,
              attribution: "© CARTO © OpenStreetMap",
              maxzoom: 19,
            },
          },
          layers: [{ id: "carto-tiles", type: "raster", source: "carto" }],
        },
        center: [lng, lat],
        zoom: 13,
        interactive: false,
        attributionControl: false,
      })

      mapRef.current = map

      map.on("load", () => {
        // Teal pin marker
        const el = document.createElement("div")
        el.style.cssText = `
          width: 16px; height: 16px; border-radius: 50%;
          background: #00BFA5; border: 2px solid white;
          box-shadow: 0 0 0 4px rgba(0,191,165,0.3);
        `
        new Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
      })
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [lat, lng])

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#050a0f]">
      <div ref={containerRef} className="w-full h-full" />
      {/* Name label */}
      <div className="absolute top-3 left-3 rounded-md border border-[#00BFA533] bg-[#050a0f]/90 backdrop-blur-sm px-3 py-1.5">
        <p className="text-[9px] font-mono uppercase tracking-widest text-[#00BFA5]">Location</p>
        <p className="text-[11px] font-semibold text-white">{name}</p>
      </div>
    </div>
  )
}

// SSR-safe export
export function CommunityMiniMap(props: CommunityMiniMapProps) {
  return <MiniMapInner {...props} />
}
