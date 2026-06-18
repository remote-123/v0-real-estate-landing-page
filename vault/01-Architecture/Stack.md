# Stack

## Core
| Layer | Tech | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Server components, ISR, middleware |
| Database | DigitalOcean Managed Postgres | PG17, nyc1, db-s-1vcpu-1gb, $15/mo flat. Migrated from Neon 2026-06-17 |
| Hosting | Vercel | Auto-deploy on push to main |
| CMS | Sanity | Blog posts, project listings |
| Auth | Better Auth v1 | Google OAuth, postgres adapter |
| Styling | Tailwind CSS + shadcn/ui | Dark terminal aesthetic |
| Charts | Recharts | ResponsiveContainer, dark theme |
| Email | Resend | Transactional + digest emails |
| Video | Shotstack | Paused — video shorts pipeline removed 2026-06-17 |

## DB Connection
```ts
// lib/db.ts
import postgres from 'postgres'
const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 })
```
`DATABASE_URL` = DO Managed Postgres connection string (Vercel env).
Host: `main-postgres-do-user-38763524-0.f.db.ondigitalocean.com:25060`
DB: `defaultdb`, User: `doadmin`

> pg_dump/psql work directly against DO — no special integration needed. Use connection string from DO MCP or DO dashboard.

## Multi-Domain Split
- `northcapitaldxb.com` — agency/advisory brand
- `thecityregistry.com` — data platform brand (same codebase)
- `middleware.ts` detects `host` header → sets `x-site` header (`cityregistry` | `northcapital`)

## Key Env Vars
| Var | Purpose |
|---|---|
| `DATABASE_URL` | DO Managed Postgres connection string |
| `CRON_SECRET` | All cron route auth (Bearer token) |
| `RAPIDAPI_KEY` | PropertyFinder API (700/mo) |
| `BAYUT_RAPIDAPI_KEY` | Bayut14 API (900/mo) |
| `GEMINI_BLOG_API_KEY` | Blog + X post generation |
| `GEMINI_DISTRESS_API_KEY` | Distress digest |
| `GEMINI_PDF_API_KEY` | PDF project summaries |
| `BETTER_AUTH_SECRET` | Auth session signing |
| `BETTER_AUTH_URL` | Auth origin (prod: northcapitaldxb.com) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `BLOG_GENERATOR_SECRET` | Apps Script webhook auth |
| `SANITY_WEBHOOK_SECRET` | Sanity → X post trigger |
| `TELEGRAM_BOT_TOKEN` | Error alert bot |
| `ADMIN_PASSCODE` | Admin dashboard access |
| `ADMIN_EMAILS` | Bypass passcode for these emails |

## postgres.js NUMERIC Gotcha
postgres.js returns NUMERIC columns as **strings**. Always coerce:
```ts
rows.map(r => ({ ...r, field: Number(r.field) }))
```
