/**
 * Seed developer_profiles table from static TypeScript data.
 * Run: npx tsx scripts/seed/seed-developer-profiles.ts
 */

import { config } from "dotenv"
import postgres from "postgres"
import { DEVELOPER_PROFILES } from "../../lib/area-data/developer-profiles"

config({ path: ".env.local" })

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING!, { ssl: "require" })

async function main() {
  console.log(`Seeding ${Object.keys(DEVELOPER_PROFILES).length} developer profiles...`)

  for (const [dldName, profile] of Object.entries(DEVELOPER_PROFILES)) {
    // Skip brand-only placeholder entries (not real DLD names)
    const isPlaceholder = dldName.endsWith("_BRAND")
    const actualDldName = isPlaceholder ? null : dldName

    await sql`
      INSERT INTO developer_profiles
        (dld_name, brand_name, founded, hq, market_type, flagship_project, active_areas, listed, tagline)
      VALUES
        (
          ${actualDldName ?? profile.brand_name},
          ${profile.brand_name},
          ${profile.founded},
          ${profile.hq},
          ${profile.type},
          ${profile.flagship_project},
          ${profile.active_areas},
          ${profile.listed},
          ${profile.tagline}
        )
      ON CONFLICT (dld_name) DO UPDATE SET
        brand_name      = EXCLUDED.brand_name,
        founded         = EXCLUDED.founded,
        hq              = EXCLUDED.hq,
        market_type     = EXCLUDED.market_type,
        flagship_project = EXCLUDED.flagship_project,
        active_areas    = EXCLUDED.active_areas,
        listed          = EXCLUDED.listed,
        tagline         = EXCLUDED.tagline,
        updated_at      = NOW()
    `
    console.log(`  ✓ ${profile.brand_name}${isPlaceholder ? " (brand-only)" : ""}`)
  }

  await sql.end()
  console.log("Done.")
}

main().catch(e => { console.error(e); process.exit(1) })
