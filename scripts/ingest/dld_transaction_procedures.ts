/**
 * Ingest DLD Transaction Procedures lookup CSV into `dld_transaction_procedures` table.
 * Run: npx tsx --env-file=.env.local scripts/ingest/dld_transaction_procedures.ts [path/to/csv]
 */

import fs from "fs"
import path from "path"
import { parse } from "csv-parse"
import { sql } from "./neon-client"

// ── Config ──────────────────────────────────────────────────────────────────

const CSV_PATH =
  process.argv[2] ??
  path.join(process.cwd(), "dld_data", "2Lkp_Transaction_Procedures.csv")

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

// ── Row transform ─────────────────────────────────────────────────────────────

function transformRow(row: Record<string, string>) {
  return {
    group_id:            toInt(row["group_id"]),
    procedure_id:        toInt(row["procedure_id"]),
    is_pre_registration: nullify(row["is_pre_registration"]) === "1",
    name_ar:             nullify(row["name_ar"]),
    name_en:             nullify(row["name_en"]),
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
      await sql`INSERT INTO dld_transaction_procedures ${sql(batch)} ON CONFLICT (group_id, procedure_id) DO NOTHING`
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
    if (transformed.group_id === null || transformed.procedure_id === null) {
      skipped++
      continue
    }
    batch.push(transformed)
    if (batch.length >= BATCH_SIZE) await flush()
  }

  await flush()
  console.log(`\nDone. Inserted: ${inserted} rows | Skipped (no ID): ${skipped}`)
  await sql.end()
}

ingest().catch((err) => {
  console.error(err)
  process.exit(1)
})
