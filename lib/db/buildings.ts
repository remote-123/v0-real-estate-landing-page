import { supabase } from "@/lib/supabase"

export interface BuildingAgeResult {
  community_name: string
  avg_construction_year: number
  min_construction_year: number
  max_construction_year: number
  building_count: number
}

export interface BuildingRecord {
  building_id: string
  construction_year: number | null
  completion_date: string | null
  community_name: string | null
  building_type: string | null
  building_usages: string | null
  typical_floors: number | null
  building_height: number | null
  is_green_building: boolean | null
}

/**
 * Normalise a Bayut community name to the format used in the DM buildings table.
 * DM uses uppercase with different abbreviations (e.g. "IND." for Industrial).
 */
function normaliseCommunity(name: string): string {
  return name
    .toUpperCase()
    .replace(/\bINDUSTRIAL\b/g, "IND.")
    .replace(/\bFIRST\b/g, "FIRST")
    .replace(/\bSECOND\b/g, "SECOND")
    .replace(/\bTHIRD\b/g, "THIRD")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Get average / min / max construction year for a community.
 * Matches loosely using ILIKE so minor naming differences are tolerated.
 */
export async function getBuildingAgeByCommunity(
  communityName: string
): Promise<BuildingAgeResult | null> {
  const normalised = normaliseCommunity(communityName)
  // Try exact normalised match first, then partial
  const { data, error } = await supabase
    .from("buildings")
    .select("construction_year, community_name")
    .ilike("community_name", `%${normalised}%`)
    .not("construction_year", "is", null)

  if (error || !data || data.length === 0) return null

  const years = data.map((r) => r.construction_year as number)
  return {
    community_name: data[0].community_name ?? communityName,
    avg_construction_year: Math.round(years.reduce((a, b) => a + b, 0) / years.length),
    min_construction_year: Math.min(...years),
    max_construction_year: Math.max(...years),
    building_count: years.length,
  }
}

/**
 * Get building age for a specific cluster/building name.
 * Falls back to community-level lookup if no direct match.
 */
export async function getBuildingAgeByCluster(
  clusterName: string,
  communityName?: string
): Promise<BuildingAgeResult | null> {
  // Try matching the cluster name directly against community_name (some DM entries match)
  const { data, error } = await supabase
    .from("buildings")
    .select("construction_year, community_name")
    .ilike("community_name", `%${clusterName}%`)
    .not("construction_year", "is", null)
    .limit(10)

  if (!error && data && data.length > 0) {
    const years = data.map((r) => r.construction_year as number)
    return {
      community_name: clusterName,
      avg_construction_year: Math.round(years.reduce((a, b) => a + b, 0) / years.length),
      min_construction_year: Math.min(...years),
      max_construction_year: Math.max(...years),
      building_count: years.length,
    }
  }

  // Fall back to community-level
  if (communityName) return getBuildingAgeByCommunity(communityName)
  return null
}

/**
 * Get age stats for multiple communities at once (used by screener / market-lab).
 */
export async function getBuildingAgesByCommunities(
  communityNames: string[]
): Promise<Record<string, BuildingAgeResult>> {
  const results: Record<string, BuildingAgeResult> = {}
  await Promise.all(
    communityNames.map(async (name) => {
      const result = await getBuildingAgeByCommunity(name)
      if (result) results[name] = result
    })
  )
  return results
}

/**
 * Get all unique communities in the buildings table (useful for debugging coverage).
 */
export async function getAvailableCommunities(): Promise<string[]> {
  const { data, error } = await supabase
    .from("buildings")
    .select("community_name")
    .not("community_name", "is", null)
    .order("community_name")

  if (error || !data) return []
  return [...new Set(data.map((r) => r.community_name as string))]
}
