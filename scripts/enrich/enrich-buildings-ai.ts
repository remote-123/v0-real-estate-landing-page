/**
 * enrich-buildings-ai.ts
 *
 * Uses Claude Code CLI (`claude -p`) to fill missing fields in nc_buildings:
 * developer, completion_year, total_units, bedroom breakdown,
 * nearest_metro (functioning|planned), nearest_highway.
 *
 * Flags:
 *   --slug <slug>     Process a single building (test mode)
 *   --limit <n>       Process n buildings from queue (default: 10)
 *   --write           Write results to DB (dry-run by default)
 *   --missing <field> Only buildings missing this field
 *                     Options: developer | year | metro | highway | units
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/enrich/enrich-buildings-ai.ts --slug address-dubai-mall
 *   npx tsx --env-file=.env.local scripts/enrich/enrich-buildings-ai.ts --limit 10 --write
 *   npx tsx --env-file=.env.local scripts/enrich/enrich-buildings-ai.ts --limit 50 --write --missing metro
 */

import { execSync } from 'child_process'
import { sql } from '../ingest/db-client'

// ── Search backends ───────────────────────────────────────────────────────────

async function exaSearch(query: string): Promise<{ text: string; url: string }[]> {
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.EXA_API_KEY! },
    body: JSON.stringify({ query, numResults: 5, contents: { text: { maxCharacters: 1500 } } }),
  })
  if (!res.ok) throw new Error(`Exa ${res.status}: ${await res.text()}`)
  const d = await res.json() as { results: { url: string; text: string }[] }
  return d.results ?? []
}

async function tavilySearch(query: string): Promise<{ text: string; url: string }[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY!,
      query,
      max_results: 5,
      include_raw_content: false,
    }),
  })
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${await res.text()}`)
  const d = await res.json() as { results: { url: string; content: string }[] }
  return (d.results ?? []).map(r => ({ url: r.url, text: r.content }))
}

async function webSearch(query: string): Promise<{ results: { text: string; url: string }[]; via: string }> {
  if (process.env.EXA_API_KEY) {
    try {
      return { results: await exaSearch(query), via: 'exa' }
    } catch { /* fall through */ }
  }
  if (process.env.TAVILY_API_KEY) {
    return { results: await tavilySearch(query), via: 'tavily' }
  }
  throw new Error('No search API key set (EXA_API_KEY or TAVILY_API_KEY)')
}

// ── Dubai Metro Station Status ────────────────────────────────────────────────
// Planned = Blue Line (not built), future extensions
const PLANNED_STATIONS = new Set([
  'Al Quoz', 'Business Bay (Blue)', 'Al Jaddaf (Blue)', 'Al Khail',
  'Dubai Silicon Oasis', 'Academic City', 'International City',
  'Dubai Creek Tower', 'Expo City Blue',
])

function metroStatus(stationName: string | null): 'functioning' | 'planned' | null {
  if (!stationName) return null
  for (const planned of PLANNED_STATIONS) {
    if (stationName.toLowerCase().includes(planned.toLowerCase())) return 'planned'
  }
  return 'functioning'
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Building = {
  slug: string
  name: string
  nc_area_slug: string | null
  developer: string | null
  completion_year: number | null
  total_units: number | null
  units_studio: number | null
  units_1br: number | null
  units_2br: number | null
  units_3br_plus: number | null
  nearest_metro: string | null
  nearest_highway: string | null
}

type EnrichResult = {
  developer: string | null
  completion_year: number | null
  total_units: number | null
  units_studio: number | null
  units_1br: number | null
  units_2br: number | null
  units_3br_plus: number | null
  nearest_metro: string | null
  nearest_highway: string | null
  metro_status: 'functioning' | 'planned' | null
  confidence: 'high' | 'medium' | 'low'
}

// ── Extraction prompt (shared) ────────────────────────────────────────────────

function buildPrompt(building: Building, context?: string): string {
  const areaLabel = building.nc_area_slug?.replace(/-/g, ' ') ?? 'Dubai'
  const intro = context
    ? `Extract data about "${building.name}" in ${areaLabel}, Dubai from the search results below.`
    : `You are a Dubai real estate expert. Provide data about "${building.name}" in ${areaLabel}, Dubai based on your knowledge.`

  return `${intro}

Return ONLY this JSON (null for unknown — do not guess):
{
  "developer": "string or null",
  "completion_year": number or null,
  "total_units": number or null,
  "units_studio": number or null,
  "units_1br": number or null,
  "units_2br": number or null,
  "units_3br_plus": number or null,
  "nearest_metro": "exact Dubai Metro station name or null",
  "nearest_highway": "short code: E11 E311 E611 SZR D63 D89 or null",
  "confidence": "high or medium or low"
}

Rules:
- Return ONLY the JSON, no markdown, no explanation
- completion_year = handover/move-in year not launch year
- E11=SZR north, E311=Emirates Rd, E611=MBZ Rd, SZR=SZR south/DIFC, D63=Al Khail Rd
- Combined totals if multi-tower${context ? `\n\nSearch results:\n${context}` : ''}`
}

function callClaude(prompt: string): string {
  return execSync(`claude -p ${JSON.stringify(prompt)}`, {
    encoding: 'utf8',
    timeout: 90000,
  }).trim()
}

function parseResult(raw: string): Partial<EnrichResult> {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned) as Partial<EnrichResult>
}

// ── Enrichment: Exa → Claude CLI fallback ────────────────────────────────────

async function enrich(building: Building): Promise<EnrichResult & { via: string }> {
  let raw: string
  let via: string

  const hasSearch = !!(process.env.EXA_API_KEY || process.env.TAVILY_API_KEY)

  if (hasSearch) {
    try {
      const areaLabel = building.nc_area_slug?.replace(/-/g, ' ') ?? 'Dubai'
      const { results, via: searchVia } = await webSearch(`${building.name} ${areaLabel} Dubai developer units completion year metro`)
      const context = results.map(r => `[${r.url}]\n${r.text}`).join('\n\n---\n\n').slice(0, 5000)
      raw = callClaude(buildPrompt(building, context))
      via = `${searchVia}+claude`
    } catch {
      raw = callClaude(buildPrompt(building))
      via = 'claude'
    }
  } else {
    raw = callClaude(buildPrompt(building))
    via = 'claude'
  }

  const parsed = parseResult(raw)
  const metro = parsed.nearest_metro ?? null
  return {
    developer:       parsed.developer       ?? null,
    completion_year: parsed.completion_year ?? null,
    total_units:     parsed.total_units     ?? null,
    units_studio:    parsed.units_studio    ?? null,
    units_1br:       parsed.units_1br       ?? null,
    units_2br:       parsed.units_2br       ?? null,
    units_3br_plus:  parsed.units_3br_plus  ?? null,
    nearest_metro:   metro,
    nearest_highway: parsed.nearest_highway ?? null,
    metro_status:    metroStatus(metro),
    confidence:      parsed.confidence ?? 'low',
    via,
  }
}

// ── DB write ──────────────────────────────────────────────────────────────────

async function writeEnrichment(slug: string, result: EnrichResult) {
  // COALESCE = only fills nulls, never overwrites manually curated data
  await sql`
    UPDATE nc_buildings SET
      developer       = COALESCE(developer,       ${result.developer}),
      completion_year = COALESCE(completion_year, ${result.completion_year}),
      total_units     = COALESCE(total_units,     ${result.total_units}),
      units_studio    = COALESCE(units_studio,    ${result.units_studio}),
      units_1br       = COALESCE(units_1br,       ${result.units_1br}),
      units_2br       = COALESCE(units_2br,       ${result.units_2br}),
      units_3br_plus  = COALESCE(units_3br_plus,  ${result.units_3br_plus}),
      nearest_metro   = COALESCE(nearest_metro,   ${result.nearest_metro}),
      nearest_highway = COALESCE(nearest_highway, ${result.nearest_highway})
    WHERE slug = ${slug}
  `
}

// ── Queue fetch ───────────────────────────────────────────────────────────────

type MissingField = 'developer' | 'year' | 'metro' | 'highway' | 'units'

function missingFilter(field: MissingField | undefined) {
  switch (field) {
    case 'developer': return sql`AND developer IS NULL`
    case 'year':      return sql`AND completion_year IS NULL`
    case 'metro':     return sql`AND nearest_metro IS NULL`
    case 'highway':   return sql`AND nearest_highway IS NULL`
    case 'units':     return sql`AND total_units IS NULL`
    default:          return sql`AND (developer IS NULL OR nearest_metro IS NULL OR nearest_highway IS NULL)`
  }
}

async function fetchQueue(limit: number, missing: MissingField | undefined): Promise<Building[]> {
  const filter = missingFilter(missing)
  return sql<Building[]>`
    SELECT slug, name, nc_area_slug,
           developer, completion_year, total_units,
           units_studio, units_1br, units_2br, units_3br_plus,
           nearest_metro, nearest_highway
    FROM nc_buildings
    WHERE name IS NOT NULL
    ${filter}
    ORDER BY data_quality DESC, name ASC
    LIMIT ${limit}
  `
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  function getArg(flag: string): string | undefined {
    const i = args.indexOf(flag)
    return i !== -1 ? args[i + 1] : undefined
  }
  const slugArg    = getArg('--slug')
  const limitArg   = getArg('--limit')
  const missingArg = getArg('--missing') as MissingField | undefined
  const write      = args.includes('--write')
  const limit      = slugArg ? 1 : Math.min(500, Number(limitArg ?? '10'))

  console.log(`\n══ nc_buildings AI Enrichment (Claude Code CLI) ══`)
  console.log(`Mode:  ${write ? '✏️  WRITE' : '🔍 DRY-RUN (pass --write to save)'}`)
  console.log(`Limit: ${limit} buildings\n`)

  let buildings: Building[]

  if (slugArg) {
    const rows = await sql<Building[]>`
      SELECT slug, name, nc_area_slug,
             developer, completion_year, total_units,
             units_studio, units_1br, units_2br, units_3br_plus,
             nearest_metro, nearest_highway
      FROM nc_buildings WHERE slug = ${slugArg}
    `
    if (rows.length === 0) throw new Error(`Building not found: ${slugArg}`)
    buildings = rows
  } else {
    buildings = await fetchQueue(limit, missingArg)
  }

  console.log(`Processing ${buildings.length} buildings...\n`)

  let success = 0, failed = 0

  for (const b of buildings) {
    const area = b.nc_area_slug?.replace(/-/g, ' ') ?? '?'
    process.stdout.write(`→ ${b.name} (${area}) ... `)

    try {
      const result = await enrich(b)

      console.log(`[${result.confidence}] via ${result.via}`)
      console.log(`    developer: ${result.developer ?? '—'}  year: ${result.completion_year ?? '—'}  units: ${result.total_units ?? '—'}`)
      console.log(`    metro:     ${result.nearest_metro ?? '—'} [${result.metro_status ?? '—'}]`)
      console.log(`    highway:   ${result.nearest_highway ?? '—'}`)

      if (write) {
        await writeEnrichment(b.slug, result)
        console.log(`    ✓ saved`)
      } else {
        console.log(`    ↳ dry-run`)
      }

      success++
    } catch (err) {
      console.log(`FAILED`)
      console.error(`    ✗ ${err instanceof Error ? err.message.slice(0, 120) : err}`)
      failed++
    }

    console.log()
  }

  console.log(`══ Done: ${success} succeeded, ${failed} failed ══\n`)
  await sql.end()
}

main().catch(err => { console.error(err); process.exit(1) })
