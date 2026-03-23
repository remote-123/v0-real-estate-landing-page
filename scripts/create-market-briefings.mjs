/**
 * Migration: create market_briefings table
 * Run: node scripts/create-market-briefings.mjs
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
  console.log('Creating market_briefings table...')

  await sql`
    CREATE TABLE IF NOT EXISTS market_briefings (
      id             BIGSERIAL PRIMARY KEY,
      generated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      content        TEXT NOT NULL,
      data_snapshot  JSONB NOT NULL DEFAULT '{}'::jsonb,
      week_label     TEXT,
      telegram_sent  BOOLEAN NOT NULL DEFAULT false
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS market_briefings_generated_at_idx ON market_briefings (generated_at DESC)`

  console.log('market_briefings table created (or already exists).')
  await sql.end()
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
