/**
 * Ingest DLD Residential Price Index CSV into `dld_price_index` table.
 * Run: npx tsx --env-file=.env.local scripts/ingest/dld_price_index.ts [path/to/csv]
 */

import fs from "fs"
import path from "path"
import { parse } from "csv-parse"
import { sql } from "./neon-client"

// ── Config ──────────────────────────────────────────────────────────────────

const CSV_PATH =
  process.argv[2] ??
  path.join(process.cwd(), "dld_data", "dld_residential.csv")

const BATCH_SIZE = 500

// ── Helpers ──────────────────────────────────────────────────────────────────

function nullify(val: string | null | undefined): string | null {
  if (!val || val.trim() === "" || val.trim().toLowerCase() === "null") return null
  return val.trim()
}

function toFloat(val: string | null | undefined): number | null {
  const n = parseFloat(nullify(val) ?? "")
  return isNaN(n) ? null : n
}

function parseDDMMYYYY(val: string | null | undefined): string | null {
  const s = nullify(val)
  if (!s) return null
  const parts = s.split("-")
  if (parts.length !== 3) return null
  return `${parts[2]}-${parts[1]}-${parts[0]}` // → YYYY-MM-DD
}

// ── Row transform ─────────────────────────────────────────────────────────────

function transformRow(row: Record<string, string>) {
  return {
    period:                         parseDDMMYYYY(row["first_date_of_month"]),
    all_monthly_index:              toFloat(row["all_monthly_index"]),
    all_quarterly_index:            toFloat(row["all_quarterly_index"]),
    all_yearly_index:               toFloat(row["all_yearly_index"]),
    flat_monthly_index:             toFloat(row["flat_monthly_index"]),
    flat_quarterly_index:           toFloat(row["flat_quarterly_index"]),
    flat_yearly_index:              toFloat(row["flat_yearly_index"]),
    villa_monthly_index:            toFloat(row["villa_monthly_index"]),
    villa_quarterly_index:          toFloat(row["villa_quarterly_index"]),
    villa_yearly_index:             toFloat(row["villa_yearly_index"]),
    all_monthly_price_index:        toFloat(row["all_monthly_price_index"]),
    all_quarterly_price_index:      toFloat(row["all_quarterly_price_index"]),
    all_yearly_price_index:         toFloat(row["all_yearly_price_index"]),
    flat_monthly_price_index:       toFloat(row["flat_monthly_price_index"]),
    flat_quarterly_price_index:     toFloat(row["flat_quarterly_price_index"]),
    flat_yearly_price_index:        toFloat(row["flat_yearly_price_index"]),
    villa_monthly_price_index:      toFloat(row["villa_monthly_price_index"]),
    villa_quarterly_price_index:    toFloat(row["villa_quarterly_price_index"]),
    villa_yearly_price_index:       toFloat(row["villa_yearly_price_index"]),
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
    try {
      await sql`INSERT INTO dld_price_index ${sql(batch)} ON CONFLICT (period) DO NOTHING`
      inserted += batch.length
      process.stdout.write(`\rInserted: ${inserted} | Skipped: ${skipped}`)
    } catch (e: any) { console.error("Insert error:", e.message) }
    batch.length = 0
  }

  const parser = fs
    .createReadStream(CSV_PATH)
    .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))

  for await (const row of parser) {
    const transformed = transformRow(row)
    if (!transformed.period) {
      skipped++
      continue
    }
    batch.push(transformed)
    if (batch.length >= BATCH_SIZE) await flush()
  }

  await flush()
  console.log(`\nDone. Inserted: ${inserted} rows | Skipped (no period): ${skipped}`)
  await sql.end()
}

ingest().catch((err) => {
  console.error(err)
  process.exit(1)
})
