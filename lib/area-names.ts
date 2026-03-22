/**
 * DLD administrative area name → marketing brand name mapping.
 * Keys are lowercase DLD names; values are the display names users recognise.
 */
export const DLD_TO_BRAND: Record<string, string> = {
  "marsa dubai": "Dubai Marina",
  "al barsha south fourth": "Jumeirah Village Circle",
  "al thanyah fifth": "Jumeirah Lake Towers",
  "burj khalifa": "Downtown Dubai",
  "hadaeq sheikh mohammed bin rashid": "Dubai Hills Estate",
  "al safouh second": "JBR",
  "al safouh first": "Al Sufouh",
  "trade center first": "DIFC",
  "trade center second": "Trade Centre",
  "al hebiah third": "Arabian Ranches",
  "al hebiah fourth": "Motor City",
  "al hebiah first": "Dubai Sports City",
  "al hebiah second": "DAMAC Hills 2",
  "al hebiah fifth": "Damac Hills",
  "al hebiah sixth": "Town Square",
  "jabal ali first": "Jabal Ali",
  "warsan fourth": "International City",
  "nadd hessa": "Dubai Silicon Oasis",
  "al barsha south fifth": "Jumeirah Village Triangle",
  "nad al shiba first": "Meydan",
  "al jadaf": "Al Jaddaf",
  "jumeirah first": "Jumeirah 1",
  "jumeirah second": "Jumeirah 2",
  "jumeirah third": "Jumeirah 3",
  "madinat al mataar": "Dubai South",
  "madinat dubai almelaheyah": "Dubai Maritime City",
  "dubai investment park first": "Dubai Investment Park 1",
  "dubai investment park second": "Dubai Investment Park 2",
  "al barsha first": "Al Barsha 1",
  "al barshaa south second": "Al Barsha South 2",
  "al barshaa south third": "Al Barsha South 3",
  "um suqaim third": "Umm Suqeim 3",
  "um suqaim first": "Umm Suqeim 1",
  "wadi al safa 2": "Wadi Al Safa 2",
  "wadi al safa 3": "Wadi Al Safa 3",
  "wadi al safa 5": "Wadi Al Safa 5",
  "al wasl": "Al Wasl",
  "al satwa": "Al Satwa",
  "al kifaf": "Al Kifaf",
  "mirdif": "Mirdif",
  "al rashidiya": "Al Rashidiya",
  "palm jumeirah": "Palm Jumeirah",
  "palm jabal ali": "Palm Jebel Ali",
  "world islands": "World Islands",
  "business bay": "Business Bay",
  "al goze fourth": "Al Quoz 4",
  "zaabeel first": "Za'abeel 1",
  "zaabeel second": "Za'abeel 2",
  "ras al khor industrial first": "Ras Al Khor",
  "bukadra": "Bukadra",
  "al khairan first": "Al Khairan",
  "al merkadh": "Al Merkadh",
  "al warsan first": "Al Warsan 1",
  "nad al hamar": "Nad Al Hamar",
  "me'aisem first": "JVT Area",
  "palm deira": "Deira Islands",
}

/**
 * All known DLD-to-brand mappings as a flat array, for reference or rendering.
 */
export const DLD_AREAS = Object.entries(DLD_TO_BRAND).map(([dld, brand]) => ({
  dld,
  brand,
}))

/**
 * Returns the marketing brand name for a given DLD administrative area name.
 * Lookup is case-insensitive. Falls back to the original name if no mapping exists.
 */
export function formatAreaName(dldName: string): string {
  if (!dldName) return dldName
  return DLD_TO_BRAND[dldName.toLowerCase()] ?? dldName
}
