---
name: DB Migration — Neon → DigitalOcean
description: Migration from Neon to DO Managed Postgres completed 2026-06-17. DO is now the live DB.
type: project
---

Migration complete as of 2026-06-17.

**Why:** Neon free tier was hitting CU-hour quota limits. DO is $15/mo flat, no metered compute.

**DO cluster:**
- Name: `main-postgres`
- ID: `960921c9-8ede-4d90-a9f3-77fef64540b6`
- Region: nyc1
- Engine: PG17, db-s-1vcpu-1gb
- DB: `defaultdb`, User: `doadmin`
- Host: `main-postgres-do-user-38763524-0.f.db.ondigitalocean.com:25060`

**Connection string** (in Vercel env as `DATABASE_URL`):
`postgresql://doadmin:***@main-postgres-do-user-38763524-0.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require`
(password stored in Vercel env + .env.local only — not in git)

**lib/db.ts:** No code changes needed. `ssl: 'require'` works with DO.

**Neon status:** Vercel integration still exists but DATABASE_URL no longer points to it. Can be disconnected from Vercel → Storage when ready.

**How to apply:** Use this connection string for scripts, migrations, and any new DB work. DO MCP (mcp__digitalocean__*) is authenticated and can manage the cluster.
