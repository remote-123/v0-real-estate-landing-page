/**
 * Migration: Drop & recreate Better Auth tables with camelCase column names
 * Better Auth's Kysely adapter uses camelCase (expiresAt, userId, etc.)
 * Run: npx tsx --env-file=.env.local scripts/migrate/003_fix_better_auth_columns.ts
 */

import postgres from "postgres"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 })

async function main() {
  console.log("Dropping old snake_case Better Auth tables...")
  await sql`DROP TABLE IF EXISTS "verification" CASCADE`
  await sql`DROP TABLE IF EXISTS "account" CASCADE`
  await sql`DROP TABLE IF EXISTS "session" CASCADE`
  await sql`DROP TABLE IF EXISTS "user" CASCADE`

  console.log("Recreating with camelCase columns...")

  await sql`
    CREATE TABLE "user" (
      "id"            TEXT NOT NULL PRIMARY KEY,
      "name"          TEXT NOT NULL,
      "email"         TEXT NOT NULL UNIQUE,
      "emailVerified" BOOLEAN NOT NULL DEFAULT false,
      "image"         TEXT,
      "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt"     TIMESTAMP NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE "session" (
      "id"         TEXT NOT NULL PRIMARY KEY,
      "expiresAt"  TIMESTAMP NOT NULL,
      "token"      TEXT NOT NULL UNIQUE,
      "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
      "ipAddress"  TEXT,
      "userAgent"  TEXT,
      "userId"     TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
    )
  `

  await sql`
    CREATE TABLE "account" (
      "id"                     TEXT NOT NULL PRIMARY KEY,
      "accountId"              TEXT NOT NULL,
      "providerId"             TEXT NOT NULL,
      "userId"                 TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "accessToken"            TEXT,
      "refreshToken"           TEXT,
      "idToken"                TEXT,
      "accessTokenExpiresAt"   TIMESTAMP,
      "refreshTokenExpiresAt"  TIMESTAMP,
      "scope"                  TEXT,
      "password"               TEXT,
      "createdAt"              TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt"              TIMESTAMP NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE "verification" (
      "id"         TEXT NOT NULL PRIMARY KEY,
      "identifier" TEXT NOT NULL,
      "value"      TEXT NOT NULL,
      "expiresAt"  TIMESTAMP NOT NULL,
      "createdAt"  TIMESTAMP DEFAULT now(),
      "updatedAt"  TIMESTAMP DEFAULT now()
    )
  `

  console.log("Done. Better Auth tables ready with camelCase columns.")
  await sql.end()
}

main().catch(err => { console.error(err); process.exit(1) })
