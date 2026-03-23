/**
 * Migration: create email_leads table
 * Run: node scripts/create-email-leads.mjs
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load DATABASE_URL from .env.local
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
  console.log('Creating email_leads table...')

  await sql`
    CREATE TABLE IF NOT EXISTS email_leads (
      id            BIGSERIAL PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      source        TEXT NOT NULL DEFAULT 'terminal',
      area_interest TEXT,
      subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_sent_at  TIMESTAMPTZ,
      unsubscribed_at TIMESTAMPTZ,
      send_count    INTEGER NOT NULL DEFAULT 0
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS email_leads_email_idx ON email_leads (email)`
  await sql`CREATE INDEX IF NOT EXISTS email_leads_subscribed_at_idx ON email_leads (subscribed_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS email_leads_unsub_idx ON email_leads (unsubscribed_at) WHERE unsubscribed_at IS NULL`

  console.log('email_leads table created (or already exists).')
  await sql.end()
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
