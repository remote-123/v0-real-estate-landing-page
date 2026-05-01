# API Budget

## Monthly Limits
| API | Env Var | Budget | Used For |
|---|---|---|---|
| PropertyFinder (RapidAPI) | `RAPIDAPI_KEY` | 700 req/mo | distress_listings + rental_listings daily crons |
| Bayut14 (RapidAPI) | `BAYUT_RAPIDAPI_KEY` | 900 req/mo | Transaction freshness (25 pages/day) |
| Gemini Blog | `GEMINI_BLOG_API_KEY` | — | Blog + X post generation |
| Gemini Distress | `GEMINI_DISTRESS_API_KEY` | — | Distress digest + LinkedIn |
| Gemini PDF | `GEMINI_PDF_API_KEY` | — | PDF project summaries |
| Gemini Generic | `GEMINI_API_KEY` | — | Reddit monitor |
| Shotstack | — | — | Video shorts |

## Budget Tracking
`bayut_ingest_log` table tracks per-cron-run API usage.
`lib/api-budget.ts` defines `BAYUT14_BUDGET` (900/mo).
