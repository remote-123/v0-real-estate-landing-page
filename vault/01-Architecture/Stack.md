# Stack

## Core
| Layer | Tech | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Server components, ISR, middleware |
| Database | Neon PostgreSQL | Pooled via postgres.js, ssl:require, max:1 |
| Hosting | Vercel | Auto-deploy on push to main |
| CMS | Sanity | Blog posts, project listings |
| Auth | Better Auth v1 | Google OAuth, postgres adapter |
| Styling | Tailwind CSS + shadcn/ui | Dark terminal aesthetic |
| Charts | Recharts | ResponsiveContainer, dark theme |
| Email | Resend | Transactional + digest emails |
| Video | Shotstack | Distress deal video shorts |

## DB Connection
```ts
// lib/db.ts
import postgres from 'postgres'
const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 })
```
`DATABASE_URL` = Neon pooled URL (from `.env.local` or Vercel env).

> Neon project is Vercel-integrated — lives under Vercel's Neon org, NOT personal Neon account. Neon MCP can't see it. Use `.env.local` directly for scripts.

## Multi-Domain Split
- `northcapitaldxb.com` — agency/advisory brand
- `thecityregistry.com` — data platform brand (same codebase)
- `middleware.ts` detects `host` header → sets `x-site` header (`cityregistry` | `northcapital`)

## Key Env Vars
| Var | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `CRON_SECRET` | All cron route auth (Bearer token) |
| `RAPIDAPI_KEY` | PropertyFinder API (700/mo) |
| `BAYUT_RAPIDAPI_KEY` | Bayut14 API (900/mo) |
| `GEMINI_BLOG_API_KEY` | Blog + X post generation |
| `GEMINI_DISTRESS_API_KEY` | Distress digest + LinkedIn |
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
