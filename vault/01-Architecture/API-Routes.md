# API Routes

## Webhook / Trigger Routes
| Route | Caller | Auth Secret | Gemini Key |
|---|---|---|---|
| `/api/ai-blog-generator` | Apps Script (Gmail label) | `BLOG_GENERATOR_SECRET` | `GEMINI_BLOG_API_KEY` |
| `/api/ai-blog-to-xpost` | Sanity webhook | `SANITY_WEBHOOK_SECRET` | `GEMINI_BLOG_API_KEY` |
| `/api/project-pdf-email` | Apps Script (Gmail label) | `BLOG_GENERATOR_SECRET` | `GEMINI_PDF_API_KEY` |
| `/api/project-pdf-upload` | Manual form upload | `ADMIN_PASSCODE` | `GEMINI_PDF_API_KEY` |
| `/api/reddit-monitor` | cron-job.org | `CRON_SECRET` | `GEMINI_API_KEY` |

## Cron Wrapper Routes (public GET endpoints for cron-job.org)
| Route | Internal POST | Schedule |
|---|---|---|
| `/api/cron/fetch-rental-listings` | — | Daily 06:00 UTC |
| `/api/cron/snapshot-distress-listings` | — | Daily 06:30 UTC |
| `/api/cron/fetch-bayut-transactions` | — | Daily 06:45 UTC ❌ not set up |
| `/api/cron/generate-x-posts` | → `/api/distress-xpost` | cron-job.org |
| `/api/cron/generate-linkedin-posts` | → `/api/distress-linkedin` | cron-job.org |
| `/api/cron/generate-video-shorts` | → `/api/distress-video` | cron-job.org |
| `/api/cron/generate-market-briefing` | — | Monday 06:00 UTC |
| `/api/cron/weekly-distress-digest` | — | Monday 07:00 UTC |

All cron routes auth: `Authorization: Bearer CRON_SECRET`

## Auth Routes
| Route | Purpose |
|---|---|
| `/api/auth/[...all]` | Better Auth handler (Google OAuth) |

## Data Routes
| Route | Purpose |
|---|---|
| `/api/building-search` | Typeahead for building comparator |
| `/api/building-data` | Chart data for building comparator |

## Error Alerting
`sendTelegramError(route, stage, error, context?)` in `lib/telegram.ts`
Wired into: `ai-blog-generator`, `ai-blog-to-xpost`, `distress-video`, `fetch-bayut-transactions`, `fetch-rental-listings`, `snapshot-distress-listings`
