/**
 * Ingest DLD Projects CSV into Neon `dld_projects` table.
 * Run: npx tsx --env-file=.env.local scripts/ingest/dld_projects.ts [path/to/csv]
 */
import fs from "fs"
import path from "path"
import { parse } from "csv-parse"
import { sql } from "./neon-client"

const CSV_PATH =
  process.argv[2] ??
  path.join(process.cwd(), "dld_data", "dld_projects.csv")

const BATCH_SIZE = 500

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

function parseDDMMYYYY(val: string | null | undefined): string | null {
  const s = nullify(val)
  if (!s) return null
  const parts = s.split("-")
  if (parts.length !== 3) return null
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

function transformRow(row: Record<string, string>) {
  return {
    project_id:             toInt(row["project_id"]),
    project_number:         nullify(row["project_number"]),
    project_name_en:        nullify(row["project_name"]),   // no English name in CSV — use Arabic as display name
    developer_name:         nullify(row["developer_name"]),
    master_developer_name:  nullify(row["master_developer_name"]),
    project_start_date:     parseDDMMYYYY(row["project_start_date"]),
    project_end_date:       parseDDMMYYYY(row["project_end_date"]),
    project_status:         nullify(row["project_status"]),
    percent_completed:      toFloat(row["percent_completed"]),
    completion_date:        parseDDMMYYYY(row["completion_date"]),
    area_id:                toInt(row["area_id"]),
    area_name_en:           nullify(row["area_name_en"]),
    master_project_en:      nullify(row["master_project_en"]),
    no_of_lands:            toInt(row["no_of_lands"]),
    no_of_buildings:        toInt(row["no_of_buildings"]),
    no_of_villas:           toInt(row["no_of_villas"]),
    no_of_units:            toInt(row["no_of_units"]),
  }
}

async function setup() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS dld_projects (
      project_id            integer primary key,
      project_number        text,
      project_name_en       text,
      developer_name        text,
      master_developer_name text,
      project_start_date    date,
      project_end_date      date,
      project_status        text,
      percent_completed     numeric,
      completion_date       date,
      area_id               integer,
      area_name_en          text,
      master_project_en     text,
      no_of_lands           integer,
      no_of_buildings       integer,
      no_of_villas          integer,
      no_of_units           integer,
      ingested_at           timestamptz default now()
    );
    CREATE INDEX IF NOT EXISTS dld_projects_area_idx ON dld_projects(area_name_en);
    CREATE INDEX IF NOT EXISTS dld_projects_status_idx ON dld_projects(project_status);
    CREATE INDEX IF NOT EXISTS dld_projects_completion_idx ON dld_projects(completion_date);
  `)
}

async function ingest() {
  console.log(`Reading: ${CSV_PATH}`)
  await setup()

  const batch: ReturnType<typeof transformRow>[] = []
  let inserted = 0
  let skipped = 0

  const flush = async () => {
    if (batch.length === 0) return
    try {
      await sql`INSERT INTO dld_projects ${sql(batch)} ON CONFLICT (project_id) DO NOTHING`
      inserted += batch.length
      process.stdout.write(`\rInserted: ${inserted} | Skipped: ${skipped}`)
    } catch (e: any) {
      console.error("Insert error:", e.message)
    }
    batch.length = 0
  }

  const parser = fs
    .createReadStream(CSV_PATH)
    .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))

  for await (const row of parser) {
    const transformed = transformRow(row)
    if (transformed.project_id === null) {
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
