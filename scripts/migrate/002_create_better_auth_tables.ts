/**
 * Migration: Create Better Auth tables
 * Run: npx tsx --env-file=.env.local scripts/migrate/002_create_better_auth_tables.ts
 */

import postgres from "postgres"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 })

async function main() {
  console.log("Creating Better Auth tables...")

  await sql`
    CREATE TABLE IF NOT EXISTS "user" (
      id TEXT NOT NULL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified BOOLEAN NOT NULL DEFAULT false,
      image TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "session" (
      id TEXT NOT NULL PRIMARY KEY,
      expires_at TIMESTAMP NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      ip_address TEXT,
      user_agent TEXT,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "account" (
      id TEXT NOT NULL PRIMARY KEY,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at TIMESTAMP,
      refresh_token_expires_at TIMESTAMP,
      scope TEXT,
      password TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "verification" (
      id TEXT NOT NULL PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    )
  `

  console.log("Better Auth tables created successfully.")
  await sql.end()
}

main().catch(err => { console.error(err); process.exit(1) })
