/**
 * assign-areas.ts
 *
 * Batch-classifies buildings with no nc_area_slug.
 * Sends 20 buildings per Claude CLI call → 70x fewer invocations.
 *
 * Run: npx tsx --env-file=.env.local scripts/enrich/assign-areas.ts
 *      npx tsx --env-file=.env.local scripts/enrich/assign-areas.ts --write
 *      npx tsx --env-file=.env.local scripts/enrich/assign-areas.ts --write --limit=500
 */
import { execSync } from 'child_process'
import { sql } from '../ingest/db-client'

const BATCH = 20

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function main() {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const limitArg = args.find(a => a.startsWith('--limit'))?.split('=')[1]
  const limit = Math.min(1500, Number(limitArg ?? '200'))

  console.log(`\n══ Assign nc_area_slug — batch mode (${BATCH}/call) ══`)
  console.log(`Mode: ${write ? '✏️  WRITE' : '🔍 DRY-RUN'} | Limit: ${limit}\n`)

  const areas = await sql<{ slug: string; display_name: string }[]>`
    SELECT slug, display_name FROM nc_areas ORDER BY display_name
  `
  const validSlugs = new Set(areas.map(a => a.slug))
  const areaList = areas.map(a => `${a.slug}`).join(', ')

  const buildings = await sql<{ slug: string; name: string; nearest_highway: string | null; developer: string | null }[]>`
    SELECT slug, name, nearest_highway, developer
    FROM nc_buildings
    WHERE nc_area_slug IS NULL AND name IS NOT NULL
    ORDER BY name ASC
    LIMIT ${limit}
  `

  console.log(`Buildings: ${buildings.length} → ${Math.ceil(buildings.length / BATCH)} Claude calls\n`)

  let assigned = 0, skipped = 0, failed = 0

  for (const batch of chunk(buildings, BATCH)) {
    const buildingList = batch
      .map((b, i) => `${i + 1}. slug="${b.slug}" name="${b.name}" developer="${b.developer ?? ''}" highway="${b.nearest_highway ?? ''}"`)
      .join('\n')

    const prompt = `You are a Dubai real estate expert. Classify each building into its Dubai community/area.

Available area slugs: ${areaList}

Buildings:
${buildingList}

Return ONLY a JSON array, one object per building in the same order:
[{"slug":"...", "nc_area_slug":"exact-slug-or-null", "confidence":"high|medium|low"}, ...]

Rules:
- Use ONLY slugs from the provided list
- Return null if building clearly doesn't belong to any listed area
- Return ONLY the JSON array, no markdown`

    try {
      const raw = execSync(`claude -p ${JSON.stringify(prompt)}`, { encoding: 'utf8', timeout: 120000 }).trim()
      const arrMatch = raw.match(/\[[\s\S]*\]/)
      if (!arrMatch) throw new Error(`No array in response: ${raw.slice(0, 100)}`)
      const results = JSON.parse(arrMatch[0]) as { slug: string; nc_area_slug: string | null; confidence: string }[]

      for (const r of results) {
        const area = r.nc_area_slug && validSlugs.has(r.nc_area_slug) ? r.nc_area_slug : null
        console.log(`  ${r.slug} → ${area ?? 'null'} [${r.confidence}]`)

        if (area) {
          if (write) {
            await sql`UPDATE nc_buildings SET nc_area_slug = ${area} WHERE slug = ${r.slug} AND nc_area_slug IS NULL`
          }
          assigned++
        } else {
          skipped++
        }
      }

      console.log(`  [batch done: ${results.length} classified]\n`)
    } catch (err) {
      console.error(`  BATCH FAILED: ${err instanceof Error ? err.message.slice(0, 100) : err}`)
      failed += batch.length
    }

    // 3s between batches
    await new Promise(r => setTimeout(r, 3000))
  }

  const action = write ? 'written' : 'would assign'
  console.log(`\n══ Done: ${assigned} ${action}, ${skipped} no-match, ${failed} failed ══\n`)
  await sql.end()
}
main().catch(err => { console.error(err); process.exit(1) })
