# Cron Jobs

All cron routes auth: `Authorization: Bearer CRON_SECRET`
Hosted on cron-job.org (external trigger) or Vercel cron.

## Active Crons
| Route | Schedule | What | Status |
|---|---|---|---|
| `/api/cron/fetch-rental-listings` | Daily 06:00 UTC | PF rent API → `rental_listings` | ✅ |
| `/api/cron/snapshot-distress-listings` | Daily 06:30 UTC | PF sale API → `distress_listings` | ✅ |
| `/api/cron/fetch-bayut-transactions` | Daily 06:45 UTC | Bayut14 → `bayut_transactions` | ❌ cron-job.org entry missing |
| `/api/cron/generate-market-briefing` | Monday 06:00 UTC | Gemini → `market_briefings` | ✅ |
| `/api/cron/weekly-distress-digest` | Monday 07:00 UTC | Gemini + Resend → email leads | ✅ |
| `/api/cron/generate-x-posts` | Per schedule | → `/api/distress-xpost` | ✅ |
| `/api/cron/generate-linkedin-posts` | Per schedule | → `/api/distress-linkedin` | ✅ |
| `/api/cron/generate-video-shorts` | Per schedule | → `/api/distress-video` | ✅ |
| `/api/reddit-monitor` | Per schedule | Reddit scrape | ✅ |

## Error Alerting
All cron failures send Telegram alerts via `sendTelegramError()` in `lib/telegram.ts`.
Uses `TELEGRAM_BOT_TOKEN` + optional `TELEGRAM_THREAD_ID_ERRORS`.

## TODO
Add cron-job.org entry: `GET /api/cron/fetch-bayut-transactions` Bearer CRON_SECRET at 06:45 UTC
