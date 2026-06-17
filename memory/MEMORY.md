# Project Memory

## PropSearch Scraper (resume after DB migration)
→ `memory/project_propsearch_scraper.md` — 3-stage propsearch.ae scraper built but never completed. Keep all code. Resume after DO migration.

## Neon Billing & Caching
→ see CLAUDE.md and vault/05-Decisions/ADRs.md (ADR-007)

## DB Migration: Neon → DigitalOcean (IN PROGRESS)
→ `memory/project_db_migration.md` — Migrating to DO Managed Postgres $15/mo (db-s-1vcpu-1gb, nyc1). DO MCP authenticated. Cluster not yet created. Next: create cluster → pg_dump Neon direct URL → pg_restore → swap DATABASE_URL in Vercel.

## Architecture
→ see CLAUDE.md and vault/01-Architecture/

## Telegram Pipelines (REMOVED)
Removed all Telegram content/digest automation (ops-digest, telegram-distress-digest, cofounder-heartbeat, xpost approval flow). Keep only: `lib/telegram.ts` sendTelegramError() for error alerting, and the Telegram MCP plugin for Claude sessions.
