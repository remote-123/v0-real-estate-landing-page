# API Routes

> Last updated: 2026-05-01

## Lead Capture (Public)

| Route | Method | What | Auth | External |
|---|---|---|---|---|
| `/api/contact` | POST | Form leads → Google Sheets + Telegram | Public | Google Sheets, Telegram |
| `/api/leads/email-capture` | POST | Terminal email capture (rate-limit: 5/10min) | Public | Telegram |
| `/api/leads/whatsapp-intent` | POST | WhatsApp tap intent signals (rate-limit: 10/5min) | Public | Telegram |
| `/api/leads/unsubscribe` | GET | One-click unsubscribe (base64 token) | Public | — |

## Data APIs (Public)

| Route | Method | What |
|---|---|---|
| `/api/area-psf-trend` | GET | PSF trend by month for building or area |
| `/api/building-data` | GET | Side-by-side building comparison (PSF, service charges, rentals) |
| `/api/building-search` | GET | Building name autocomplete |
| `/api/search` | GET | Global terminal search (pages + DLD areas) |
| `/api/communities/stats` | GET | Community yield/PSF aggregation from rental_listings |

## Admin (Cookie: `admin_auth` = `ADMIN_PASSCODE`)

| Route | Method | What |
|---|---|---|
| `/api/admin/login` | POST | Set httpOnly cookie (8h) |
| `/api/admin/logout` | POST | Clear cookie |
| `/api/admin/buildings` | GET, PATCH | Buildings search/paginate/edit (re_buildings) |
| `/api/admin/areas` | GET, PUT, DELETE | Bayut→DLD area mapping CRUD (area_name_mapping) |
| `/api/admin/projects` | GET, PATCH | DLD projects search/paginate/edit (dld_projects) |
| `/api/project-pdf-upload` | POST | PDF upload → Gemini → Sanity draft |

## AI Content Generation

| Route | Method | Auth Secret | Gemini Key | What |
|---|---|---|---|---|
| `/api/ai-blog-generator` | POST | `BLOG_GENERATOR_SECRET` | `GEMINI_BLOG_API_KEY` | Email (Gmail Apps Script) → Sanity blog draft |
| `/api/blog-from-url` | POST | `BLOG_GENERATOR_SECRET` or cookie | `GEMINI_BLOG_API_KEY` | URL → Sanity blog draft |
| `/api/project-pdf-email` | POST | `BLOG_GENERATOR_SECRET` | `GEMINI_PDF_API_KEY` | Gmail PDF → Sanity project draft |
| `/api/ai-blog-to-xpost` | POST | `SANITY_WEBHOOK_SECRET` | `GEMINI_BLOG_API_KEY` | Published blog → X post draft → Telegram |

## Distress & Social Content (`CRON_SECRET`)

| Route | Method | What | External |
|---|---|---|---|
| `/api/distress-xpost` | POST | Top PF deals → 3 X posts → Telegram | RapidAPI/PF, Gemini, Telegram |
| `/api/distress-linkedin` | POST | Top PF deals → LinkedIn post (3 rotating formats) → Telegram | RapidAPI/PF, Gemini, Telegram |
| `/api/distress-video` | POST | Top PF deal → 15s 9:16 Shotstack video → Telegram | RapidAPI/PF, Shotstack, Telegram |
| `/api/reddit-monitor` | POST | Reddit scrape → AI reply drafts → Telegram | Reddit, Gemini, Telegram |
| `/api/market-briefing/generate` | GET/POST | DLD data → Gemini 500-word brief → DB + Telegram | Gemini, Telegram |

## Cron Jobs (cron-job.org · `Authorization: Bearer CRON_SECRET`)

| Route | Schedule | What | Status |
|---|---|---|---|
| `/api/cron/fetch-rental-listings` | Daily 06:00 UTC | PF rental listings → rental_listings | ✅ Active |
| `/api/cron/snapshot-distress-listings` | Daily 06:30 UTC | PF listings → distress tracking + price drop detection | ✅ Active |
| `/api/cron/fetch-bayut-transactions` | Daily 06:45 UTC | Bayut transactions → DB (800/mo budget guard) | ⚠️ 0 rows — verify cron-job.org entry |
| `/api/cron/generate-x-posts` | Daily | → `/api/distress-xpost` | ✅ Active |
| `/api/cron/generate-linkedin-posts` | Daily | → `/api/distress-linkedin` | ✅ Active |
| `/api/cron/generate-video-shorts` | Daily | → `/api/distress-video` | ✅ Active |
| `/api/cron/telegram-distress-digest` | Daily | Top 10 distress deals (Bayut+PF) → Telegram | ✅ Active |
| `/api/cron/generate-market-briefing` | Monday 06:00 UTC | → `/api/market-briefing/generate` | ✅ Active |
| `/api/cron/weekly-distress-digest` | Monday 07:00 UTC | Top 5 deals → Resend email to all subscribers | ✅ Active |

## Webhooks & Bot

| Route | Method | Auth | What |
|---|---|---|---|
| `/api/telegram-webhook` | POST | `TELEGRAM_WEBHOOK_SECRET` | Bot: `/leads`, `/briefing` commands + URL → blog (background) |
| `/api/telegram-xpost-approved` | POST | `SANITY_WEBHOOK_SECRET` | Sanity approval → Telegram notify |
| `/api/auth/[...all]` | GET, POST | Better Auth | Google OAuth signin/signup/callback |

## Error Alerting

`sendTelegramError(route, stage, error, context?)` in `lib/telegram.ts`

Wired into: `ai-blog-generator`, `ai-blog-to-xpost`, `blog-from-url`, `distress-video`, `fetch-bayut-transactions`, `fetch-rental-listings`, `snapshot-distress-listings`

Optional thread: `TELEGRAM_THREAD_ID_ERRORS` (falls back to main group chat)

## External Services Summary

| Service | Used By |
|---|---|
| Google Sheets | `/api/contact` |
| Gemini 2.5 Flash | ai-blog-generator, blog-from-url, project-pdf-*, distress-*, reddit-monitor, market-briefing, weekly-distress-digest, ai-blog-to-xpost |
| Sanity CMS | ai-blog-generator, blog-from-url, project-pdf-* |
| RapidAPI / PropertyFinder | distress-xpost, distress-linkedin, distress-video, snapshot-distress-listings, fetch-rental-listings, telegram-distress-digest |
| RapidAPI / Bayut | fetch-bayut-transactions, telegram-distress-digest |
| Shotstack | distress-video |
| Telegram Bot API | contact, email-capture, whatsapp-intent, all content routes (drafts + error alerts) |
| Resend | weekly-distress-digest |
| Reddit (public API) | reddit-monitor |
