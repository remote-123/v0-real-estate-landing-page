"use client"

import { useEffect } from "react"

/**
 * Adds/removes the `.cityregistry` class on <html> so portalled elements
 * (Sheet, modals) inherit the D3 Refinitiv CSS variable overrides.
 */
export function CityRegistryTheme({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    const el = document.documentElement
    if (enabled) {
      el.classList.add("cityregistry")
    } else {
      el.classList.remove("cityregistry")
    }
    return () => {
      el.classList.remove("cityregistry")
    }
  }, [enabled])
  return null
}
