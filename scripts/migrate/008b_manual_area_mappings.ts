/**
 * 008b — Manual area mapping additions
 *
 * Low-confidence fuzzy matches that are obviously correct by inspection,
 * plus many-to-one mappings for branded Bayut names that correspond to
 * DLD districts/sub-districts.
 *
 * Run:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/migrate/008b_manual_area_mappings.ts
 */

import "dotenv/config"
import { sql } from "../ingest/neon-client"

const mappings: [string, string][] = [
  // Clear fuzzy hits (name variants)
  ["Al Muhaisnah",        "Al-Muhaisnah North"],
  ["Emirates Hills",      "Emirates Hills Fourth"],
  ["Nadd Al Hammar",      "Nad Al Hamar"],
  ["Al Warsan",           "Al Warsan First"],
  ["Nad Al Sheba",        "Nad Al Shiba"],
  ["Jumeirah Islands",    "Jumeira Island 2"],
  ["Al Twar",             "Al Twar Third"],
  ["Zabeel",              "Zabeel East"],
  ["Za'abeel",            "Zabeel East"],
  ["Al Warqa'a",          "Al Warqa First"],
  ["Umm Suqeim",          "Um Suqaim"],
  ["Al Nahda (Dubai)",    "Al-Nahdah"],
  ["Meydan",              "Almeydan"],
  ["Jebel Ali",           "Jabal Ali"],
  // Branded/master community → DLD district mapping
  ["Jumeirah Village Circle",     "Jumeira Village Circle"],
  ["Jumeirah Village Triangle",   "Jumeira Village Triangle"],
  ["Jumeirah Lake Towers",        "Jumeirah Lake Towers"],
  ["Jumeirah Beach Residence",    "Marsa Dubai"],
  ["Jumeirah Beach Residence (JBR)", "Marsa Dubai"],
  ["Dubai Harbour",               "Marsa Dubai"],
  ["Dubai Media City",            "Marsa Dubai"],
  ["Dubai Marina",                "Marsa Dubai"],
  ["Dubai Festival City",         "Festival City First"],
  ["Dubai Land",                  "Wadi Al Amardi"],
  ["Dubailand",                   "Wadi Al Amardi"],
  ["Mohammed Bin Rashid City",    "Hadaeq Sheikh Mohammed Bin Rashid"],
  ["Dubai Creek Harbour",         "Al Jadaf"],
  ["Dubai Creek Harbour (The Lagoons)", "Al Jadaf"],
  ["Deira",                       "Deira"],
  ["Culture Village",             "Al Jadaf"],
  ["Culture Village (Jaddaf Waterfront)", "Al Jadaf"],
  ["Wasl Gate",                   "Al Qusais"],
  ["Al Barari",                   "Al Baraha"],
  ["Dubai Silicon Oasis",         "Al Aweer"],
  ["Mina Rashid",                 "Bur Dubai"],
]

async function run() {
  console.log("008b — Manual area mapping additions\n")

  const [{ count: before }] = await sql<{ count: string }[]>`SELECT COUNT(*) AS count FROM area_name_mapping`
  console.log(`Before: ${before} mappings`)

  let inserted = 0
  let skipped = 0

  for (const [bayut, dld] of mappings) {
    const result = await sql`
      INSERT INTO area_name_mapping (bayut_name, dld_name)
      VALUES (${bayut}, ${dld})
      ON CONFLICT (bayut_name) DO NOTHING
    `
    if ((result as any).count > 0 || result.length === 0) {
      // postgres.js returns affected rows as result.count in some versions
      inserted++
    } else {
      skipped++
    }
  }

  const [{ count: after }] = await sql<{ count: string }[]>`SELECT COUNT(*) AS count FROM area_name_mapping`
  console.log(`After: ${after} mappings (+${Number(after) - Number(before)} new)`)

  await sql.end()
}

run().catch(e => { console.error(e); process.exit(1) })
