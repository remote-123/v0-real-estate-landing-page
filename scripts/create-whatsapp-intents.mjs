/**
 * Migration: create whatsapp_intents table
 * Run: node scripts/create-whatsapp-intents.mjs
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env.local')
    const raw = readFileSync(envPath, 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch (err) {
    console.error('Could not read .env.local:', err.message)
  }
}

loadEnv()

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 })

async function run() {
  console.log('Creating whatsapp_intents table...')

  await sql`
    CREATE TABLE IF NOT EXISTS whatsapp_intents (
      id                   BIGSERIAL PRIMARY KEY,
      listing_id           TEXT,
      title                TEXT,
      location             TEXT,
      price                NUMERIC,
      psf                  NUMERIC,
      distress_score       INTEGER,
      area_benchmark_psf   NUMERIC,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS whatsapp_intents_created_at_idx ON whatsapp_intents (created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS whatsapp_intents_listing_id_idx ON whatsapp_intents (listing_id)`

  console.log('whatsapp_intents table created (or already exists).')
  await sql.end()
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
