# Project Memory

## PropSearch Scraper (resume after DB migration)
→ `memory/project_propsearch_scraper.md` — 3-stage propsearch.ae scraper built but never completed. Keep all code. Resume after DO migration.

## DB: DigitalOcean Managed Postgres
→ `memory/project_db_migration.md` — DO cluster `main-postgres`, nyc1, PG17, $15/mo. DB = `defaultdb`. DATABASE_URL updated in Vercel + .env.local. Neon fully removed.

## Architecture
→ see CLAUDE.md and vault/01-Architecture/

## Telegram Pipelines (REMOVED)
Removed all Telegram content/digest automation (ops-digest, telegram-distress-digest, cofounder-heartbeat, xpost approval flow). Keep only: `lib/telegram.ts` sendTelegramError() for error alerting, and the Telegram MCP plugin for Claude sessions.
