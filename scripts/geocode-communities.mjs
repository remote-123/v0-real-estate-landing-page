/**
 * Geocodes all 224 Dubai communities via Nominatim.
 * Outputs lib/area-data/community-locations.ts
 * Rate limit: 1 req/sec per Nominatim ToS
 */

import { readFileSync, writeFileSync } from "fs"

// Paste community list inline (avoid TS import in plain .mjs)
const COMMUNITIES = [
  // Sector 1
  { code: "101", name: "Nakhlat Deira" },
  { code: "111", name: "Al Corniche" },
  { code: "112", name: "Al Ras" },
  { code: "113", name: "Al Dhagaya" },
  { code: "114", name: "Al Buteen" },
  { code: "115", name: "Al Sabkha" },
  { code: "116", name: "Ayal Nasir" },
  { code: "117", name: "Al Murar" },
  { code: "118", name: "Naif" },
  { code: "119", name: "Al Rega" },
  { code: "121", name: "Corniche Deira" },
  { code: "122", name: "Al Baraha" },
  { code: "123", name: "Al Muteena" },
  { code: "124", name: "Al Murqabat" },
  { code: "125", name: "Riggat Al Buteen" },
  { code: "126", name: "Abu Hail" },
  { code: "127", name: "Hor Al Anz" },
  { code: "128", name: "Al Khabisi" },
  { code: "129", name: "Port Saeed" },
  { code: "131", name: "Al Hamriya Port" },
  { code: "132", name: "Al Waheda" },
  { code: "133", name: "Hor Al Anz East" },
  { code: "134", name: "Al Mamzar" },
  // Sector 2
  { code: "213", name: "Nad Shamma" },
  { code: "214", name: "Al Garhoud" },
  { code: "215", name: "Umm Ramool" },
  { code: "216", name: "Al Rashidiya" },
  { code: "221", name: "Dubai Airport" },
  { code: "226", name: "Al Twar First" },
  { code: "227", name: "Al Twar Second" },
  { code: "228", name: "Al Twar Third" },
  { code: "231", name: "Al Nahda First" },
  { code: "232", name: "Al Qusais" },
  { code: "233", name: "Al Twar Fifth" },
  { code: "234", name: "Al Twar Fourth" },
  { code: "241", name: "Al Nahda Second" },
  { code: "242", name: "Al Qusais Industrial First" },
  { code: "243", name: "Al Qusais Industrial Second" },
  { code: "244", name: "Muhaisnah Third" },
  { code: "245", name: "Muhaisnah Fourth" },
  { code: "246", name: "Al Qusais Industrial Third" },
  { code: "247", name: "Al Qusais Industrial Fourth" },
  { code: "248", name: "Al Qusais Industrial Fifth" },
  { code: "251", name: "Mirdif" },
  { code: "252", name: "Mushrif" },
  { code: "261", name: "Muhaisnah First" },
  { code: "262", name: "Al Mizhar First" },
  { code: "263", name: "Al Mizhar Second" },
  { code: "264", name: "Muhaisnah Second" },
  { code: "265", name: "Al Mizhar Fourth" },
  { code: "266", name: "Al Mizhar Third" },
  { code: "267", name: "Muhaisnah Fifth" },
  { code: "268", name: "Oud Al Muteena" },
  { code: "271", name: "Wadi Alamardi" },
  { code: "281", name: "Al Khawaneej One" },
  { code: "282", name: "Al Khawaneej Two" },
  { code: "283", name: "Al Ayas" },
  { code: "284", name: "Al Ttay" },
  // Sector 3
  { code: "302", name: "Jumeirah Bay" },
  { code: "303", name: "World Islands" },
  { code: "311", name: "Al Shindagha" },
  { code: "312", name: "Al Souk Al Kabir" },
  { code: "313", name: "Al Hamriya" },
  { code: "314", name: "Umm Hurair First" },
  { code: "315", name: "Umm Hurair Second" },
  { code: "316", name: "Al Rifa" },
  { code: "317", name: "Al Mankhool" },
  { code: "318", name: "Al Karama" },
  { code: "319", name: "Oud Metha" },
  { code: "321", name: "Dubai Maritime City" },
  { code: "322", name: "Al Hudaiba" },
  { code: "323", name: "Al Jafiliya" },
  { code: "324", name: "Al Kifaf" },
  { code: "325", name: "Zabeel First" },
  { code: "326", name: "Al Jaddaf" },
  { code: "332", name: "Jumeirah First" },
  { code: "333", name: "Al Bada" },
  { code: "334", name: "Al Satwa" },
  { code: "335", name: "Trade Centre 1" },
  { code: "336", name: "Trade Centre 2" },
  { code: "337", name: "Zabeel Second" },
  { code: "342", name: "Jumeirah Second" },
  { code: "343", name: "Al Wasl" },
  { code: "345", name: "Downtown Dubai" },
  { code: "346", name: "Business Bay" },
  { code: "347", name: "Al Markada" },
  { code: "352", name: "Jumeirah Third" },
  { code: "353", name: "Al Safa First" },
  { code: "354", name: "Al Quoz First" },
  { code: "355", name: "Ghadeer Al Tair" },
  { code: "356", name: "Umm Suqeim First" },
  { code: "357", name: "Al Safa Second" },
  { code: "358", name: "Al Quoz Third" },
  { code: "359", name: "Al Quoz Fourth" },
  { code: "362", name: "Umm Suqeim Second" },
  { code: "363", name: "Al Manara" },
  { code: "364", name: "Al Quoz Industrial First" },
  { code: "365", name: "Al Quoz Industrial Second" },
  { code: "366", name: "Umm Suqeim Third" },
  { code: "367", name: "Umm Al Sheif" },
  { code: "368", name: "Al Quoz Industrial Third" },
  { code: "369", name: "Al Quoz Industrial Fourth" },
  { code: "372", name: "Al Sufouh First" },
  { code: "373", name: "Al Barsha First" },
  { code: "375", name: "Al Barsha Third" },
  { code: "376", name: "Al Barsha Second" },
  { code: "381", name: "Palm Jumeirah" },
  { code: "382", name: "Al Sufouh Second" },
  { code: "383", name: "Al Thanyah First" },
  { code: "384", name: "Al Thanyah Second" },
  { code: "388", name: "Al Thanyah Third" },
  { code: "392", name: "Dubai Marina" },
  { code: "393", name: "Al Thanyah Fifth" },
  { code: "394", name: "Al Thanyah Fourth" },
  // Sector 4
  { code: "412", name: "Al Kheeran" },
  { code: "413", name: "Ras Al Khor" },
  { code: "415", name: "Al Khairan First" },
  { code: "416", name: "Nad Al Hammar" },
  { code: "421", name: "Al Warqaa First" },
  { code: "422", name: "Al Warqaa Second" },
  { code: "423", name: "Al Warqaa Third" },
  { code: "424", name: "Al Warqaa Fourth" },
  { code: "425", name: "Al Warqaa Fifth" },
  { code: "431", name: "Al Athbah" },
  // Sector 5
  { code: "501", name: "Palm Jebel Ali" },
  { code: "511", name: "Hessyan First" },
  { code: "512", name: "Hessyan Second" },
  { code: "518", name: "Jebel Ali Industrial Second" },
  { code: "521", name: "Madinat Al Mataar" },
  { code: "531", name: "Saih Shuaib 2" },
  { code: "532", name: "Saih Shuaib 3" },
  { code: "533", name: "Saih Shuaib 4" },
  { code: "591", name: "Jebel Ali First" },
  { code: "592", name: "Jebel Ali Second" },
  { code: "594", name: "Mena Jebel Ali" },
  { code: "597", name: "Dubai Investment Park Second" },
  { code: "598", name: "Dubai Investment Park First" },
  { code: "599", name: "Jebel Ali Industrial First" },
  // Sector 6
  { code: "612", name: "Ras Al Khor Industrial First" },
  { code: "614", name: "Ras Al Khor Industrial Third" },
  { code: "615", name: "Nad Al Sheba Second" },
  { code: "616", name: "Nad Al Sheba Third" },
  { code: "617", name: "Nad Al Sheba Fourth" },
  { code: "618", name: "Nad Al Sheba First" },
  { code: "621", name: "Warsan First" },
  { code: "622", name: "Warsan Second" },
  { code: "624", name: "Warsan Fourth" },
  { code: "626", name: "Nad Hessa" },
  { code: "631", name: "Hadaeq Sheikh Mohammed Bin Rashid" },
  { code: "643", name: "Wadi Al Safa 2" },
  { code: "645", name: "Wadi Al Safa 3" },
  { code: "648", name: "Wadi Al Safa 5" },
  { code: "664", name: "Wadi Al Safa 6" },
  { code: "665", name: "Wadi Al Safa 7" },
  { code: "671", name: "Al Barsha South First" },
  { code: "672", name: "Al Barsha South Second" },
  { code: "673", name: "Al Barsha South Third" },
  { code: "674", name: "Al Hebiah First" },
  { code: "676", name: "Al Hebiah Third" },
  { code: "677", name: "Al Hebiah Sixth" },
  { code: "681", name: "Al Barsha South Fourth" },
  { code: "682", name: "Al Hebiah Fourth" },
  { code: "683", name: "Al Hebiah Fifth" },
  { code: "684", name: "Al Barsha South Fifth" },
  { code: "685", name: "Me'aisem First" },
  // Sector 7
  { code: "711", name: "Al Awir First" },
  { code: "721", name: "Al Awir Second" },
  { code: "731", name: "Lehbab First" },
  // Sector 8
  { code: "811", name: "Warsan 3" },
  { code: "812", name: "Al Rowaiyah First" },
  { code: "814", name: "Al Rowaiyah Third" },
  { code: "841", name: "Margham" },
  { code: "891", name: "Hatta" },
  // Sector 9
  { code: "913", name: "Madinat Hind 3" },
  { code: "914", name: "Madinat Hind 4" },
  { code: "921", name: "Al Yalayis 1" },
  { code: "922", name: "Al Yalayis 2" },
  { code: "931", name: "Al Lesaily" },
  { code: "961", name: "Madinat Latifa" },
]

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function geocode(name) {
  const q = encodeURIComponent(`${name}, Dubai, UAE`)
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ae`
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "thecityregistry.com/1.0 geocoding@cityregistry.com" }
    })
    const data = await res.json()
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {}
  return null
}

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

console.log(`Geocoding ${COMMUNITIES.length} communities (1 req/sec)...`)

const results = {}
for (let i = 0; i < COMMUNITIES.length; i++) {
  const c = COMMUNITIES[i]
  const loc = await geocode(c.name)
  const slug = toSlug(c.name)
  if (loc) {
    results[slug] = [loc.lat, loc.lng]
    process.stdout.write(`✓ ${c.name} → ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}\n`)
  } else {
    process.stdout.write(`✗ ${c.name} → not found\n`)
  }
  if (i < COMMUNITIES.length - 1) await sleep(1100)
}

// Generate TS file
const lines = Object.entries(results).map(([slug, [lat, lng]]) =>
  `  "${slug}": [${lat}, ${lng}],`
).join('\n')

const output = `// Auto-generated by scripts/geocode-communities.mjs
// DO NOT EDIT — re-run script to refresh
export const COMMUNITY_LOCATIONS: Record<string, [number, number]> = {
${lines}
}

export function getCommunityLocation(slug: string): [number, number] | null {
  return COMMUNITY_LOCATIONS[slug] ?? null
}
`

writeFileSync('lib/area-data/community-locations.ts', output)
console.log(`\nDone. Wrote ${Object.keys(results).length} locations to lib/area-data/community-locations.ts`)
