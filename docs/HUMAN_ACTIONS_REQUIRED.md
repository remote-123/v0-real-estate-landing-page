# Human Actions Required — North Capital DXB
## Updated: 2026-03-26

---

### P0 — Strategic Data Initiative (In-Person Required)

- [ ] **Fresh DLD transaction data — visit DLD in person (Dubai)**
  - Current open data CSVs are stale (latest `instance_date` is not within last 30 days, which breaks market briefing and area momentum freshness)
  - Goal: establish a direct data feed or bulk export agreement with DLD for monthly/weekly transaction updates
  - Also ask about: API access, `dld_building_nk` key availability (needed for exact building age matching — see architecture note), and data licensing terms for commercial use
  - Until this is resolved: `/terminal/market-briefing` shows placeholder, area momentum scores are based on old data, and building age on rental-drops is fuzzy-matched

---

### P1 — Blocks Live Features (do first)

- [DONE ] **Create Resend account** — resend.com — free tier: 3,000 emails/month. Get the API key from the dashboard.
- [DONE ] **Add `RESEND_API_KEY` to Vercel env** — Settings > Environment Variables. Without this, digest emails log to console but are not delivered.
- [DONE ] **Verify sender domain in Resend** — northcapitaldxb.com — Resend will give you 2-3 DNS records (SPF, DKIM) to add in Cloudflare/your DNS provider. The from address used is `digest@northcapitaldxb.com`.
- [DONE ] **Register weekly digest cron on cron-job.org**:
  - URL: `GET https://www.northcapitaldxb.com/api/cron/weekly-distress-digest`
  - Schedule: Monday 07:00 UTC
  - Header: `Authorization: Bearer <CRON_SECRET>`
- [DONE ] **Register market briefing cron on cron-job.org**:
  - URL: `GET https://www.northcapitaldxb.com/api/cron/generate-market-briefing`
  - Schedule: Monday 06:00 UTC (runs before the digest)
  - Header: `Authorization: Bearer <CRON_SECRET>`
- [DONE ] **Register distress snapshot cron on cron-job.org** (if not already done):
  - URL: `GET https://www.northcapitaldxb.com/api/cron/snapshot-distress-listings`
  - Schedule: Daily 06:30 UTC
  - Header: `Authorization: Bearer <CRON_SECRET>`
- [DONE ] **Add `TELEGRAM_THREAD_ID_LEADS` to Vercel env** — Create a dedicated Telegram thread for lead notifications so they don't get mixed with content alerts. Get the thread ID from @userinfobot or by inspecting a forwarded message.

---

### P2 — Enhances Features (do this week)

- [DONE ] **Add `TELEGRAM_THREAD_ID_CONTENT` to Vercel env** — Separate Telegram thread for market briefing previews. Falls back to main chat if not set.
- [ DONE] **Register Google Search Console** — northcapitaldxb.com — submit the sitemap at `/sitemap.xml`. All 12 terminal pages + all community pages are now included.
- [ ] **Verify rental_listings pipeline** — The table has 0 rows. Check cron-job.org logs for `/api/cron/fetch-listings`. RapidAPI key may have expired or rate limit hit. Table exists in Neon with correct schema.
- [ ] **Test email capture manually**:
  ```bash
  curl -X POST https://www.northcapitaldxb.com/api/leads/email-capture \
    -H 'Content-Type: application/json' \
    -d '{"email":"ceo@northcapitaldxb.com","source":"manual-test"}'
  ```
  Expected: `{ "ok": true, "already_subscribed": false }` + Telegram notification.
- [ ] **Test unsubscribe link** — The token is base64url of the email. To generate one for testing:
  ```bash
  node -e "console.log(Buffer.from('your@email.com').toString('base64url'))"
  ```
  Then visit: `https://www.northcapitaldxb.com/api/leads/unsubscribe?token=<output>`

---

### P3 — Strategic Decisions

- [x] **Auth layer decision** — Migrated to **Better Auth** with Google OAuth. `next-auth` removed.
- [ ] **Add Better Auth env vars to Vercel** — Required for production:
  - `BETTER_AUTH_SECRET` — random secret (run: `openssl rand -base64 32`)
  - `BETTER_AUTH_URL` — `https://www.northcapitaldxb.com`
  - `NEXT_PUBLIC_BETTER_AUTH_URL` — `https://www.northcapitaldxb.com`
  - Keep existing: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
  - Remove old: `AUTH_SECRET`, `AUTH_URL` (NextAuth vars no longer needed)
- [ ] **Update Google OAuth redirect URI** — In Google Cloud Console, add:
  `https://www.northcapitaldxb.com/api/auth/callback/google` (Better Auth uses this path)
  Local dev: `http://localhost:3000/api/auth/callback/google`
- [ ] **Add Apple Sign-In** — Requires Apple Developer account, App ID, and `Services ID` for web OAuth. Credentials needed: `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET` (JWT). Add `apple` to `socialProviders` in `auth.ts` and re-enable button in `components/auth/sign-in-form.tsx`.
- [ ] **Add LinkedIn Sign-In** — Requires LinkedIn Developer app with `Sign In with LinkedIn using OpenID Connect` product enabled. Credentials needed: `AUTH_LINKEDIN_ID`, `AUTH_LINKEDIN_SECRET`. Add `linkedin` to `socialProviders` in `auth.ts` and re-enable button in `components/auth/sign-in-form.tsx`.
- [x] **Social post deep-links** — DONE in cycle 3: X-post route already had the deep-link. LinkedIn route sends it in the first comment. Both confirmed.
- [ ] **Developer Track page** — New page at `/terminal/developer-track` uses `dld_projects` table. If the query returns very few results, check the `developer_name` column population in `dld_projects` — some rows may have NULL or blank developer names.

### P2 — New items from Cycle 3 (2026-03-24 overnight)

- [ ] **Verify `rental_listings` table** — Table has 0 rows. `/terminal/rental-drops` page is commented out of sidebar. Check cron-job.org logs for `/api/cron/fetch-listings`. If RapidAPI key is expired or rate-limited, the page cannot be re-enabled. The page file exists — just needs data.
- [ ] **Market Briefing display page** — `/terminal/market-briefing` is live but will show "Briefing generates Monday 6AM UTC" placeholder until the market briefing cron has run at least once. Trigger it manually via POST to `/api/market-briefing/generate` with Bearer CRON_SECRET to pre-populate.
- [ ] **ROI Engine benchmarks — service charges column** — The `dld_service_charges.service_cost` is a total budget figure per service category per project, not a per-sqft fee. The service charges table in the ROI Engine shows avg annual cost per community for reference. If you want a per-sqft service charge fee, this would need to be computed from `dld_units` (unit size) joined with `dld_service_charges` by `project_id` — flag for future enhancement.
- [ ] **Off-Plan Pipeline page** — `/terminal/off-plan-pipeline` is live using `dld_projects`. If completion years show as '—' for many rows, the `completion_date` column may be sparsely populated. Check: `SELECT COUNT(*) FROM dld_projects WHERE completion_date IS NOT NULL`.

---

### P1 — New items from Cycle 4 (2026-03-23 overnight)

- [ ] **Register Telegram bot commands** — In BotFather, send `/setcommands` for your bot and add:
  ```
  leads - Show email lead counts and last 5 subscribers
  briefing - Show latest market briefing preview
  ```
  Without this, Telegram won't show autocomplete for `/leads` and `/briefing`, but the commands will still work when typed manually.

- [ ] **Test Admin Dashboard** — Visit `https://www.northcapitaldxb.com/admin/dashboard?passcode=YOUR_ADMIN_PASSCODE`. All 5 panels should render. If `distress_listings` or `market_briefings` panels show "Table unavailable", those tables haven't been created in Neon yet (the distress snapshot cron creates `distress_listings`; the market briefing cron creates `market_briefings`).

### P2 — New items from Cycle 4 (2026-03-23 overnight)

- [ ] **Mortgage Calculator** — Live at `/terminal/mortgage-calculator`. No env vars or DB needed — fully client-side. Verify the page renders correctly on mobile.

- [ ] **Rental Yield Calculator** — Live at `/terminal/rental-yield`. Requires `dld_transactions` table rows (populated) and `dld_service_charges` table rows. If the service charge column in the table is blank for most areas, the "Avg Service Charge" column will show "—" — this is expected.

- [ ] **Area Deep-Dive pages** — Live at `/terminal/areas/[slug]` for top 20 DLD areas. The `distress_count` stat card will always show 0 until `distress_listings` is populated by the snapshot cron. The `distress_listings` query has a graceful fallback so it will not break if the table is missing.

- [ ] **Distress score note** — `distress_listings.confidence_score` column in Neon is currently unused by the display layer. The page computes `distressScore` live from PropertyFinder enrichment. If you want to persist scores to DB for historical analysis, this would need a new migration to store the enriched score alongside each snapshot row.

---

### Reference — All API Routes

| Route | Caller | Auth | Notes |
|---|---|---|---|
| `/api/leads/email-capture` | Widget (browser) | None | Rate limited: 5/IP/10min |
| `/api/leads/unsubscribe` | Email link | None (token-based) | Sets `unsubscribed_at` |
| `/api/leads/whatsapp-intent` | Widget (browser) | None | Fire-and-forget |
| `/api/cron/weekly-distress-digest` | cron-job.org | `CRON_SECRET` | Monday 07:00 UTC |
| `/api/cron/generate-market-briefing` | cron-job.org | `CRON_SECRET` | Monday 06:00 UTC |
| `/api/cron/snapshot-distress-listings` | cron-job.org | `CRON_SECRET` | Daily 06:30 UTC |
| `/api/market-briefing/generate` | Internal (POST from cron wrapper) | `CRON_SECRET` | Do not call directly |
| `/api/ai-blog-generator` | Apps Script | `BLOG_GENERATOR_SECRET` | Gmail label trigger |
| `/api/project-pdf-email` | Apps Script | `BLOG_GENERATOR_SECRET` | Gmail label trigger |
| `/api/reddit-monitor` | cron-job.org | `CRON_SECRET` | Subreddit intelligence |
