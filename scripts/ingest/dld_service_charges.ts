/**
 * Ingest DLD Service Charges CSV into `dld_service_charges` table.
 * Run: npx tsx --env-file=.env.local scripts/ingest/dld_service_charges.ts [path/to/csv]
 */

import fs from "fs"
import path from "path"
import { parse } from "csv-parse"
import { sql } from "./neon-client"

// ── Config ──────────────────────────────────────────────────────────────────

const CSV_PATH =
  process.argv[2] ??
  path.join(process.cwd(), "dld_data", "dld_service_charge.csv")

const BATCH_SIZE = 500

// ── Helpers ──────────────────────────────────────────────────────────────────

function nullify(val: string | null | undefined): string | null {
  if (!val || val.trim() === "" || val.trim().toLowerCase() === "null") return null
  return val.trim()
}

function toInt(val: string | null | undefined): number | null {
  const n = parseInt(nullify(val) ?? "", 10)
  return isNaN(n) ? null : n
}

function toFloat(val: string | null | undefined): number | null {
  const n = parseFloat(nullify(val) ?? "")
  return isNaN(n) ? null : n
}

// ── Row transform ─────────────────────────────────────────────────────────────

function transformRow(row: Record<string, string>) {
  return {
    master_community_id:        toInt(row["master_community_id"]),
    master_community_name_en:   nullify(row["master_community_name_en"]),
    master_community_name_ar:   nullify(row["master_community_name_ar"]),
    property_group_id:          toInt(row["property_group_id"]),
    property_group_name_en:     nullify(row["property_group_name_en"]),
    property_group_name_ar:     nullify(row["property_group_name_ar"]),
    project_id:                 toInt(row["project_id"]),
    project_name:               nullify(row["project_name"]),
    usage_id:                   toInt(row["usage_id"]),
    usage_name_en:              nullify(row["usage_name_en"]),
    usage_name_ar:              nullify(row["usage_name_ar"]),
    budget_year:                toInt(row["budget_year"]),
    service_cost:               toFloat(row["service_cost"]),
    service_category_id:        toInt(row["service_category_id"]),
    service_category_name_en:   nullify(row["service_category_name_en"]),
    service_category_name_ar:   nullify(row["service_category_name_ar"]),
    management_company_id:      toInt(row["management_company_id"]),
    management_company_name_en: nullify(row["management_company_name_en"]),
    management_company_name_ar: nullify(row["management_company_name_ar"]),
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function ingest() {
  console.log(`Reading: ${CSV_PATH}`)

  const batch: ReturnType<typeof transformRow>[] = []
  let inserted = 0
  let skipped = 0

  const flush = async () => {
    if (batch.length === 0) return
    // Deduplicate within batch on all 5 constraint fields before sending
    const seen = new Set<string>()
    const deduped = batch.filter(r => {
      const key = `${r.project_id}|${r.budget_year}|${r.service_category_id}|${r.usage_id}|${r.management_company_id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    try {
      await sql`INSERT INTO dld_service_charges ${sql(deduped)} ON CONFLICT (project_id, budget_year, service_category_id, usage_id, management_company_id) DO NOTHING`
      inserted += deduped.length
      process.stdout.write(`\rInserted: ${inserted} | Skipped: ${skipped}`)
    } catch (e: any) { console.error("Insert error:", e.message) }
    batch.length = 0
  }

  const parser = fs
    .createReadStream(CSV_PATH)
    .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))

  for await (const row of parser) {
    const transformed = transformRow(row)
    if (transformed.project_id === null || transformed.budget_year === null || transformed.service_category_id === null) {
      skipped++
      continue
    }
    batch.push(transformed)
    if (batch.length >= BATCH_SIZE) await flush()
  }

  await flush()
  console.log(`\nDone. Inserted: ${inserted} rows | Skipped (no unique key): ${skipped}`)
  await sql.end()
}

ingest().catch((err) => {
  console.error(err)
  process.exit(1)
})
