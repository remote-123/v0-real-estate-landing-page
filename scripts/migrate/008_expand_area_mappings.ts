/**
 * 008 — Expand area_name_mapping via fuzzy match
 *
 * Strategy:
 *   1. Find all distinct area names in rental_listings not yet in area_name_mapping
 *   2. Fuzzy-match each against dld_areas.name_en using pg_trgm similarity
 *   3. Auto-insert matches with similarity >= 0.7
 *   4. Also insert exact-name matches (Bayut name = DLD name, both exist in dld_areas)
 *   5. Print low-confidence candidates (0.3–0.7) for manual review
 *
 * Run:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/migrate/008_expand_area_mappings.ts
 */

import "dotenv/config"
import { sql } from "../ingest/neon-client"

async function run() {
  console.log("008 — Expand area_name_mapping via fuzzy match\n")

  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`

  // ── 1. Current state ────────────────────────────────────────────────────────
  const [{ count: existingCount }] = await sql<{ count: string }[]>`
    SELECT COUNT(*) AS count FROM area_name_mapping
  `
  console.log(`  Current mappings: ${existingCount}`)

  // ── 2. Unmapped Bayut areas ─────────────────────────────────────────────────
  const unmapped = await sql<{ bayut_name: string; listing_count: number }[]>`
    SELECT
      r.area AS bayut_name,
      COUNT(*) AS listing_count
    FROM rental_listings r
    WHERE r.area IS NOT NULL
      AND r.area != ''
      AND NOT EXISTS (
        SELECT 1 FROM area_name_mapping m
        WHERE m.bayut_name = r.area
      )
    GROUP BY r.area
    ORDER BY COUNT(*) DESC
  `
  console.log(`  Unmapped Bayut areas: ${unmapped.length}\n`)

  // ── 3. Fuzzy match each against dld_areas ───────────────────────────────────
  const highConf: { bayut: string; dld: string; score: number; listings: number }[] = []
  const lowConf: { bayut: string; dld: string; score: number; listings: number }[] = []
  const noMatch: { bayut: string; listings: number }[] = []

  for (const { bayut_name, listing_count } of unmapped) {
    const matches = await sql<{ dld_name: string; score: number }[]>`
      SELECT
        a.name_en AS dld_name,
        SIMILARITY(${bayut_name}, a.name_en) AS score
      FROM dld_areas a
      WHERE SIMILARITY(${bayut_name}, a.name_en) > 0.3
      ORDER BY score DESC
      LIMIT 1
    `

    if (matches.length === 0) {
      noMatch.push({ bayut: bayut_name, listings: listing_count })
    } else {
      const { dld_name, score } = matches[0]
      const entry = { bayut: bayut_name, dld: dld_name, score: Number(score), listings: listing_count }
      if (Number(score) >= 0.7) {
        highConf.push(entry)
      } else {
        lowConf.push(entry)
      }
    }
  }

  // ── 4. Insert high-confidence matches ───────────────────────────────────────
  console.log(`  High-confidence matches (≥0.7): ${highConf.length}`)
  let inserted = 0
  for (const { bayut, dld } of highConf) {
    await sql`
      INSERT INTO area_name_mapping (bayut_name, dld_name)
      VALUES (${bayut}, ${dld})
      ON CONFLICT (bayut_name) DO NOTHING
    `
    inserted++
  }
  console.log(`  Inserted: ${inserted}\n`)

  // ── 5. Report results ────────────────────────────────────────────────────────
  console.log("HIGH CONFIDENCE (auto-inserted):")
  console.log("  Score  Listings  Bayut Name → DLD Name")
  console.log("  ─────  ────────  ───────────────────────────────────────")
  for (const { bayut, dld, score, listings } of highConf.sort((a, b) => b.score - a.score)) {
    const s = score.toFixed(2)
    console.log(`  ${s}   ${String(listings).padStart(6)}    ${bayut} → ${dld}`)
  }

  console.log("\nLOW CONFIDENCE (manual review needed):")
  console.log("  Score  Listings  Bayut Name → Best DLD Match")
  console.log("  ─────  ────────  ───────────────────────────────────────")
  for (const { bayut, dld, score, listings } of lowConf.sort((a, b) => b.score - a.score)) {
    const s = score.toFixed(2)
    console.log(`  ${s}   ${String(listings).padStart(6)}    ${bayut} → ${dld}`)
  }

  console.log("\nNO DLD MATCH (branded/new areas):")
  for (const { bayut, listings } of noMatch) {
    console.log(`  ${String(listings).padStart(6)} listings  ${bayut}`)
  }

  // ── 6. Final count ──────────────────────────────────────────────────────────
  const [{ count: finalCount }] = await sql<{ count: string }[]>`
    SELECT COUNT(*) AS count FROM area_name_mapping
  `
  console.log(`\n  Final mappings: ${finalCount} (was ${existingCount})`)

  await sql.end()
}

run().catch(e => { console.error(e); process.exit(1) })
