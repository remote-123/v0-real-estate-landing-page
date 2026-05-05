import { getAreaDescription } from "@/lib/area-descriptions"
import type { DubaiCommunity } from "@/lib/area-data/dubai-communities"

const SECTOR_CONTEXT: Record<number, string> = {
  1: "Situated in historic Deira — Dubai's original commercial heart — the area is characterised by dense urban neighbourhoods, traditional souks, and direct access to the Dubai Creek waterfront.",
  2: "Located in north Dubai, the area offers a mix of established residential suburbs and proximity to Dubai International Airport, with good connectivity via Emirates Road and Al Ittihad Road.",
  3: "Part of Dubai's central and western corridor, the area benefits from direct access to Sheikh Zayed Road, the Dubai Metro, and proximity to major commercial and leisure destinations.",
  4: "Situated in north-central Dubai, the area is a quieter residential zone with easy access to Deira and the broader city via Al Khail Road and the outer ring roads.",
  5: "Located in southwest Dubai near Jebel Ali Port — one of the world's largest container ports — the area supports significant industrial and logistics activity with growing residential developments.",
  6: "Part of New Dubai's master-planned expansion, the area features modern residential communities, international schools, retail hubs, and green spaces along the Al Khail and Emirates Road corridors.",
  7: "Situated in northeast Dubai's desert fringe, the area is predominantly undeveloped with low-density settlement and proximity to the Dubai–Al Ain Road corridor.",
  8: "Located in Dubai's eastern region, the area extends towards the Hajar Mountains and the Hatta exclave, featuring desert landscapes, conservation areas, and a distinct mountainous microclimate.",
  9: "Part of South Dubai's vast semi-arid expanse, the area forms the southern boundary of the emirate and includes conservation reserves, agricultural land, and planned future development zones.",
}

/**
 * Returns a description for a community.
 * Priority: propsearch crawl → auto-generated from Wikipedia data
 */
export function getCommunityDescription(community: DubaiCommunity): string {
  // 1. Try propsearch description by display name
  const propsearch = getAreaDescription(community.name)
  if (propsearch) return propsearch

  // 2. Auto-generate from Wikipedia data
  const popStr = community.population > 0
    ? ` with a recorded population of ${community.population.toLocaleString()} residents (2022 municipal census)`
    : ""

  const areaStr = ` covering approximately ${community.area_km2} km²`

  const context = SECTOR_CONTEXT[community.sector] ?? ""

  return `${community.name} is a community in Dubai's ${community.sectorName} region,${areaStr}${popStr}. ${context}`.trim()
}
