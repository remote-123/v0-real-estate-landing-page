/**
 * enrich-areas-ai.ts
 *
 * Enriches nc_buildings metro + highway at area level.
 * One search per area (65 areas) instead of one per building (5,782).
 * After this, run enrich-buildings-ai.ts for per-building overrides.
 *
 * Also fills completion_year for "complete" status buildings missing a year
 * (year is stored per-building, not per-area — handled separately).
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/enrich/enrich-areas-ai.ts
 *   npx tsx --env-file=.env.local scripts/enrich/enrich-areas-ai.ts --write
 *   npx tsx --env-file=.env.local scripts/enrich/enrich-areas-ai.ts --area downtown-dubai --write
 */

import { execSync } from 'child_process'
import { sql } from '../ingest/db-client'

// ── Types ─────────────────────────────────────────────────────────────────────

type AreaResult = {
  metro_stations: string[]   // nearest 1-3 stations, in order of proximity
  primary_metro: string      // closest single station to use as default
  highways: string[]         // all nearby highways
  primary_highway: string    // closest/most relevant
  confidence: 'high' | 'medium' | 'low'
}

// ── Metro status ──────────────────────────────────────────────────────────────

const PLANNED_STATIONS = new Set([
  'Al Quoz', 'Business Bay (Blue)', 'Al Jaddaf (Blue)', 'Al Khail',
  'Dubai Silicon Oasis', 'Academic City', 'International City',
  'Dubai Creek Tower', 'Expo City Blue',
])

function metroStatus(s: string): 'functioning' | 'planned' {
  for (const p of PLANNED_STATIONS) {
    if (s.toLowerCase().includes(p.toLowerCase())) return 'planned'
  }
  return 'functioning'
}

// ── Search ────────────────────────────────────────────────────────────────────

async function tavilySearch(query: string): Promise<{ url: string; text: string }[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY!, query, max_results: 5 }),
  })
  if (!res.ok) throw new Error(`Tavily ${res.status}`)
  const d = await res.json() as { results: { url: string; content: string }[] }
  return (d.results ?? []).map(r => ({ url: r.url, text: r.content }))
}

async function exaSearch(query: string): Promise<{ url: string; text: string }[]> {
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.EXA_API_KEY! },
    body: JSON.stringify({ query, numResults: 5, contents: { text: { maxCharacters: 1000 } } }),
  })
  if (!res.ok) throw new Error(`Exa ${res.status}`)
  const d = await res.json() as { results: { url: string; text: string }[] }
  return d.results ?? []
}

async function webSearch(query: string): Promise<{ results: { url: string; text: string }[]; via: string }> {
  if (process.env.EXA_API_KEY) {
    try { return { results: await exaSearch(query), via: 'exa' } } catch { /* fallthrough */ }
  }
  if (process.env.TAVILY_API_KEY) {
    return { results: await tavilySearch(query), via: 'tavily' }
  }
  return { results: [], via: 'none' }
}

// ── Claude CLI ────────────────────────────────────────────────────────────────

function callClaude(prompt: string): string {
  return execSync(`claude -p ${JSON.stringify(prompt)}`, {
    encoding: 'utf8', timeout: 90000,
  }).trim()
}

// ── Area enrichment ───────────────────────────────────────────────────────────

async function enrichArea(areaSlug: string, areaName: string): Promise<AreaResult & { via: string }> {
  const { results, via: searchVia } = await webSearch(
    `nearest Dubai Metro station to ${areaName} Dubai AND main highway road access`
  )

  const context = results.length > 0
    ? results.map(r => `[${r.url}]\n${r.text}`).join('\n\n---\n\n').slice(0, 4000)
    : ''

  const prompt = `You are a Dubai geography expert. For the Dubai community/area "${areaName}", identify the nearest Dubai Metro stations and main road/highway access.

${context ? `Search results:\n${context}\n\n` : ''}Return ONLY this JSON:
{
  "metro_stations": ["list of nearest metro station names, closest first, max 3"],
  "primary_metro": "single closest station name or null",
  "highways": ["list of nearby highway codes: E11 E311 E611 SZR D63 D89"],
  "primary_highway": "most relevant highway code or null",
  "confidence": "high or medium or low"
}

Rules:
- Use exact Dubai Metro station names
- Highway codes: E11=SZR north, E311=Emirates Rd, E611=MBZ Rd, SZR=SZR south/DIFC, D63=Al Khail Rd, D89=Al Qudra
- Return null arrays [] if area has no nearby metro (e.g. remote areas like Hatta)
- Return ONLY the JSON`

  const raw = callClaude(prompt)
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(cleaned) as AreaResult

  return {
    metro_stations:  parsed.metro_stations  ?? [],
    primary_metro:   parsed.primary_metro   ?? '',
    highways:        parsed.highways        ?? [],
    primary_highway: parsed.primary_highway ?? '',
    confidence:      parsed.confidence      ?? 'low',
    via: searchVia ? `${searchVia}+claude` : 'claude',
  }
}

// ── DB write ──────────────────────────────────────────────────────────────────

async function applyToArea(areaSlug: string, result: AreaResult): Promise<number> {
  const metro = result.primary_metro || null
  const highway = result.primary_highway || null

  if (!metro && !highway) return 0

  const res = await sql`
    UPDATE nc_buildings
    SET
      nearest_metro   = COALESCE(nearest_metro,   ${metro}),
      nearest_highway = COALESCE(nearest_highway, ${highway})
    WHERE nc_area_slug = ${areaSlug}
      AND (nearest_metro IS NULL OR nearest_highway IS NULL)
  `
  return res.count
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  function getArg(f: string) { const i = args.indexOf(f); return i !== -1 ? args[i+1] : undefined }
  const write   = args.includes('--write')
  const areaArg = getArg('--area')

  console.log(`\n══ Area-level Enrichment (metro + highway) ══`)
  console.log(`Mode: ${write ? '✏️  WRITE' : '🔍 DRY-RUN (pass --write to save)'}\n`)

  // Fetch areas that have buildings missing metro or highway
  const areas = areaArg
    ? await sql<{ slug: string; display_name: string }[]>`
        SELECT slug, display_name FROM nc_areas WHERE slug = ${areaArg}
      `
    : await sql<{ slug: string; display_name: string }[]>`
        SELECT na.slug, na.display_name
        FROM nc_areas na
        WHERE EXISTS (
          SELECT 1 FROM nc_buildings nb
          WHERE nb.nc_area_slug = na.slug
            AND (nb.nearest_metro IS NULL OR nb.nearest_highway IS NULL)
        )
        ORDER BY na.display_name
      `

  console.log(`Areas to process: ${areas.length}\n`)

  let success = 0, failed = 0, totalUpdated = 0

  for (const area of areas) {
    process.stdout.write(`→ ${area.display_name} (${area.slug}) ... `)
    try {
      const result = await enrichArea(area.slug, area.display_name)
      const metro = result.primary_metro || '—'
      const highway = result.primary_highway || '—'
      const metroSt = result.primary_metro ? `[${metroStatus(result.primary_metro)}]` : ''

      console.log(`[${result.confidence}] via ${result.via}`)
      console.log(`    metro:   ${metro} ${metroSt}`)
      console.log(`    highway: ${highway}`)
      if (result.metro_stations.length > 1) {
        console.log(`    others:  ${result.metro_stations.slice(1).join(', ')}`)
      }

      if (write) {
        const updated = await applyToArea(area.slug, result)
        totalUpdated += updated
        console.log(`    ✓ ${updated} buildings updated`)
      } else {
        console.log(`    ↳ dry-run`)
      }

      success++
    } catch (err) {
      console.log(`FAILED`)
      console.error(`    ✗ ${err instanceof Error ? err.message.slice(0, 100) : err}`)
      failed++
    }
    console.log()
  }

  console.log(`══ Done: ${success} areas succeeded, ${failed} failed, ${totalUpdated} buildings updated ══\n`)
  await sql.end()
}

main().catch(err => { console.error(err); process.exit(1) })
