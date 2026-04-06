# Daily Log

## 2026-03-26 — propsearch.ae full CSV scraper

### What was built
Created `scripts/ingest/propsearch_full_scraper.ts` — a three-phase scraper that writes all output to local CSV files in `propsearch_data/` (gitignored).

- **Phase 1**: Fetches `propsearch.ae/dubai/area-guides`, extracts all area slugs and display names dynamically (no hardcoded list), writes `propsearch_data/areas.csv`
- **Phase 2**: For each area slug, fetches `/buildings`, reuses the `extractBuildings()` regex/span approach from `propsearch_scraper.ts` (absolute-URL card regex, NAV_SLUGS blocklist, status span parsing), writes `propsearch_data/buildings.csv`
- **Phase 3**: For each unique building slug, fetches the detail page and extracts up to 9 fields (name, developer, completion_year, total_floors, total_units, property_types, amenities, service_charge, description) using regex against stripped text; writes `propsearch_data/building_details.csv`

### Supporting changes
- Added 4 npm scripts (`scrape:propsearch`, `scrape:propsearch:areas`, `scrape:propsearch:buildings`, `scrape:propsearch:details`) to `package.json`
- Added `propsearch_data/` to `.gitignore`

### Implementation notes
- Native `fetch` only — no new npm packages
- CSV written line-by-line via `fs.appendFileSync` (no memory buffering)
- Header written once on first run; file existence check supports resume
- 1.5s delay between all requests; HTTP 429 triggers exponential backoff (2s/4s/8s)
- `--phase=N`, `--resume-from=<slug>`, `--limit=N` CLI flags
- Per-item try/catch — bad rows are skipped, never crash
- Build passed cleanly (`npm run build`)

## 2026-03-26 — Auth-gating applied to five terminal pages

### What was built
Applied the same auth-gating pattern (established in `communities`) to five additional terminal pages:

- `app/terminal/rental-drops/page.tsx` — added `auth()`, `force-dynamic`, FREE_ROWS=3; passes `isAuthenticated` + `totalRows` to `RentalTable`
- `components/terminal/rental-table.tsx` — added `isAuthenticated?`, `totalRows?` props; wraps outer div with `relative`, renders `GatedTableOverlay` when locked
- `app/terminal/yield-map/page.tsx` — added `auth()`, replaced `revalidate=3600` with `force-dynamic`, FREE_ROWS=5; stat cards use full `allRows` for accurate metrics
- `components/terminal/yield-map-table.tsx` — added props + overlay, outer div gains `relative`
- `app/terminal/area-momentum/page.tsx` — added `auth()`, replaced `revalidate=3600` with `force-dynamic`, FREE_ROWS=5; stat cards use `allDisplay`; inline table wrapped with `relative` div + overlay
- `app/terminal/floor-plan-pricer/page.tsx` — added `auth()`, replaced `revalidate=3600` with `force-dynamic`, FREE_ROWS=3; summary stats use full `allRows`
- `components/terminal/pricer-controls.tsx` — added props + overlay, outer div gains `relative`
- `app/terminal/service-charges/page.tsx` — added `auth()`, replaced `revalidate=86400` with `force-dynamic`, FREE_ROWS=5; headline stats use full `allRows`
- `components/terminal/service-charges-table.tsx` — added props + overlay, outer div gains `relative`

### Implementation notes
- All five pages confirmed `ƒ (Dynamic)` in build output
- Build passed cleanly with no TypeScript errors
- Stat card headline numbers (totals, averages) always reflect the full dataset regardless of auth state
- `GatedTableOverlay` import: `@/components/auth/gated-table-overlay`
- Pages NOT gated (chart-only): `transaction-pulse`, `price-index`

---

## 2026-03-26 — Buildings Directory terminal page

### What was built
- `app/terminal/buildings/page.tsx` — server component fetching up to 200 rows from `buildings_enriched`, stats header (total, with coordinates, off-plan count), auth-gated (5 free rows for unauthenticated users), passes data to `<BuildingsTable>`
- `components/terminal/buildings-table.tsx` — TanStack Table client component; columns: rank, building name, area, type, status badge, developer, completion year, coordinates indicator; global search by name or area; sortable name/area/year columns; `<GatedTableOverlay>` for unauthenticated users
- `components/terminal/sidebar.tsx` — added "Buildings" link under Intelligence group (between Community Screener and Building Comparator), reusing existing `Building2` lucide import

### Implementation notes
- Status badge colors: complete=emerald, under_construction=yellow, planned=blue, cancelled=red, unknown=gray
- Coordinates column shows green `MapPin` when `osm_lat`/`osm_lng` are present, with tooltip showing the values
- Build verified clean: `ƒ /terminal/buildings` appears in route table, compiled successfully

---

## 2026-03-26 — Admin users analytics view

### What was built
- `app/admin/(protected)/users/page.tsx` — new server component querying the `users` table in Neon; shows stats row (total, by provider, today/this week sign-ups, total sign-ins) + a sortable table of last 200 users with columns: #, Name, Email, Provider badge, Sign-ins, First seen, Last seen
- `components/admin/admin-shell.tsx` — added "Users" nav link (under System group) pointing to `/admin/users`

### Implementation notes
- `formatRelative()` written inline — no new packages added
- Provider badges: google=blue, linkedin=indigo, apple=gray
- All pre-existing TypeScript errors are in unrelated files (footer.tsx, buildings.ts, etc.); zero new errors introduced

---

## 2026-03-25 — Morning verification session

### What was tested
- `email-capture` ✅ working — lead inserted, Telegram notification fired
- `snapshot-distress-listings` ✅ 33 listings inserted into `distress_listings`
- `weekly-distress-digest` ✅ Resend live — 2 emails sent, `bedrooms::integer` bug fixed (studio was non-numeric)
- `market-briefing/generate` ⚠️ skipped — `dld_transactions` has no rows in last 30 days (data freshness issue, not a code bug)
- Admin dashboard — server-rendered, not curl-testable; needs browser visit at `/admin/dashboard?passcode=importer!21`

### Follow-up required
- [ ] **Market briefing** — will work once new DLD transaction data is ingested (rows with `instance_date` within last 30 days). Revisit when new DLD CSV is available.
- [ ] **`rental_listings` 0-row issue** — founder checking cron-job.org logs (RapidAPI key may be expired/rate-limited)
- [ ] **Admin dashboard** — verify panels in browser at `/admin/dashboard?passcode=importer!21`

### Bug fixed
- `app/api/cron/weekly-distress-digest/route.ts` — both SQL queries now use `CASE WHEN bedrooms ~ '^\d+$' THEN bedrooms::integer ELSE NULL END` to handle non-numeric values like "studio"

---

## 2026-03-23 — Overnight Build Cycle 4 (autonomous)

### Summary
Cycle 4 built 6 deliverables: two new Tools-tier terminal pages, an Area Deep-Dive section, an admin dashboard, Telegram bot commands, and a distress score field audit.

### Items Built

**1. Mortgage Calculator — `/terminal/mortgage-calculator`**
- Server component shell with SEO metadata
- Client component `components/terminal/mortgage-calculator-client.tsx` — client-side amortisation formula: monthly payment, total interest, total cost, loan amount, principal vs interest bar
- Defaults: AED 2M / 20% / 4.5% / 25 years
- Info note on UAE bank rate norms (3.5–5.5%, 20% min down payment)
- Added to sidebar under new "Tools" group; added to sitemap

**2. Rental Yield Calculator — `/terminal/rental-yield`**
- Server component fetches top 15 areas by txn volume (last 12 months) from `dld_transactions`
- Pulls avg service charge per community from `dld_service_charges` (column: `master_community_name_en`)
- Client component `components/terminal/rental-yield-client.tsx` — area table + yield calculator; click-to-fill area price, computes gross yield and estimated net yield
- Added to sidebar under "Tools" group; added to sitemap

**3. Area Deep-Dive — `/terminal/areas/[slug]`**
- `generateStaticParams` for top 20 areas by txn volume
- Per-area: price history sparkline (12 months), off-plan pipeline with top-5 active projects, service charge avg, active distress count from `distress_listings`
- Stat cards: current avg PSF, MoM change, active distress count, pipeline units
- EmailCaptureWidget with `source="area-deep-dive"` and area name
- Link from `/terminal/communities/[slug]` → `/terminal/areas/[slug]` ("See full area analysis →")
- Added top-20 area URLs to sitemap

**4. Admin Dashboard — `/admin/dashboard`**
- Passcode auth via `?passcode=` query param against `ADMIN_PASSCODE` env var (inline GET form, no cookies needed)
- Panels: distress_listings (total, last inserted, disappeared 24h), email_leads (total, active, last subscribed), whatsapp_intents (total, last 7d), market_briefings (last generated, total), dld_transactions (total rows, latest instance_date)
- All DB calls use `Promise.allSettled` — each panel degrades independently if table is missing
- Not in sidebar, not in sitemap, robots noindex

**5. Telegram bot commands `/leads` and `/briefing`**
- Added to existing `app/api/telegram-webhook/route.ts`
- `/leads` — email_leads count, last 5 active emails, whatsapp_intents total + today
- `/briefing` — latest market_briefing content (first 800 chars) + generated_at timestamp
- Commands fire via `waitUntil` to avoid blocking Telegram's 5s timeout
- Commands respect existing `TELEGRAM_ALLOWED_USER_ID` guard

**6. Distress Score Field Audit**
- `distressScore` is computed at render time in `app/terminal/distress-deals/page.tsx` by `scoreDistress()` — not stored in DB
- `distress_listings` table has `confidence_score` but the page does not read it — it recomputes from live enrichment data
- No mismatch: the card prop `distressScore` is always supplied from the server page; `confidence_score` in DB is unused by the display layer
- No changes required; documented here for future reference

### Bug Fixed
- `dld_service_charges` table uses `master_community_name_en` not `community_name` — fixed in both `app/terminal/rental-yield/page.tsx` and `app/terminal/areas/[slug]/page.tsx`

### Build Status
`✓ Compiled successfully` — no TypeScript errors, all pages generated

---

## 2026-03-24 — Overnight Build Cycle 3 (autonomous)

### Strategy Input
Read `docs/OVERNIGHT_STRATEGY_2026-03-24.md` and `docs/HUMAN_ACTIONS_REQUIRED.md` from prior sessions. Mapped all 7 build items against codebase state.

### What Was Built

#### A. ROI Engine — Live DLD Data Connected
**`app/terminal/roi-engine/page.tsx`** — converted from a static info page to a server component (`revalidate = 3600`):
- `fetchAreaBenchmarks()` — queries `dld_transactions` for avg sale PSF by area + bedroom type (last 12 months, sales only, 500–150,000 AED/sqm filter, min 10 transactions)
- `fetchServiceCharges()` — queries `dld_service_charges` by `master_community_name_en` for avg annual service cost per community (budget year 2023+)
- New section: **Live Area Benchmarks table** — top 12 areas by transaction volume, Studio/1BR/2BR/3BR columns, `formatAreaName()` applied
- New section: **Service Charge Reference** — community name, avg annual DLD-registered cost, project count
- `revalidate = 3600` added — was previously not a server component at all
- Note: `dld_service_charges.service_cost` is a total annual budget per service category (not per-sqft). Shown as reference, not per-sqft fee.

#### B. Market Briefing Display Page (NEW)
**`app/terminal/market-briefing/page.tsx`** — new server component:
- Queries `market_briefings` table for latest record: `content`, `generated_at`, `week_label`
- Shows week label as header, formatted content (preserves paragraphs, detects section headings for styling), generated timestamp
- If no briefing exists: shows "Briefing generates Monday 6AM UTC" placeholder card with schedule info
- Metadata: canonical, OG, description
- Added to sidebar nav: Intelligence group, `Newspaper` icon
- Added to sitemap: `/terminal/market-briefing`

#### C. Distress Deep-Links (confirmed existing — no change needed)
- `app/api/distress-xpost/route.ts` — `buildPostText()` already hardcodes `northcapitaldxb.com/terminal/distress-deals` in every post (line 31)
- `app/api/distress-linkedin/route.ts` — already sends deep-link in the Telegram first-comment suggestion
- Marked P3 item as complete in `docs/HUMAN_ACTIONS_REQUIRED.md`

#### D. Off-Plan Pipeline — New Terminal Page (NEW)
**`app/terminal/off-plan-pipeline/page.tsx`** — new server component (`revalidate = 3600`):
- Data from `dld_projects` — groups by `area_name_en`, filters on active/not_started/pending statuses
- Stat cards: Off-Plan Units Tracked, Active Projects, Areas with Pipeline, Largest Pipeline Area
- Table: area, active units (emerald highlighted), total units, project count, earliest/latest completion year, % complete progress bar
- `formatAreaName()` applied to area column
- Full metadata with canonical + OG
- Added to sidebar nav: Intelligence group, `Building2` icon
- Added to sitemap: `/terminal/off-plan-pipeline`

#### E. Blog → Terminal Deep-Linking
**`lib/ai-guidelines.ts`** — added STEP 4 (terminal deep-links) to `BLOG_JSON_FORMAT_RULE`:
- Lists all 14 terminal pages with matching topic keywords
- Instructs Gemini to include natural in-text deep-links when the blog post topic matches a terminal page
- Pattern: "Run the live data on [topic] at northcapitaldxb.com/terminal/page"
- Does not force links — only include when genuinely relevant
- The `getGeminiPrompt()` function injects `BLOG_JSON_FORMAT_RULE` into the prompt, so this is automatically used by both `ai-blog-generator` and `blog-from-url`

#### F. Homepage — Live Distress Deals CTA
**`components/hero.tsx`** — added a fourth CTA button in the hero:
- "Live Distress Deals" with red pulsing dot indicator
- Links to `/terminal/distress-deals` (highest-conversion path)
- Styled with `border-red-500/30 text-red-400` to stand out as urgency signal
- Placed after the existing "Market Intelligence" terminal button

### Pre-existing (confirmed, no change needed)
- X-post and LinkedIn deep-links: already present in both routes
- Sitemap: already had all terminal pages from prior sessions; added 2 new entries

### Build Status
Clean — compiled successfully, 0 TypeScript errors. 105 pages generated. `npm run build` ✅

### New Files
- `app/terminal/market-briefing/page.tsx`
- `app/terminal/off-plan-pipeline/page.tsx`

### Modified Files
- `app/terminal/roi-engine/page.tsx` — converted to server component with live DLD queries
- `lib/ai-guidelines.ts` — added terminal deep-link instructions to BLOG_JSON_FORMAT_RULE
- `components/hero.tsx` — added Live Distress Deals CTA button
- `components/terminal/sidebar.tsx` — added Off-Plan Pipeline + Market Briefing links
- `app/sitemap.ts` — added 2 new terminal static routes
- `docs/HUMAN_ACTIONS_REQUIRED.md` — appended Cycle 3 items

### Rental Drops Status
`rental_listings` table still has 0 rows (per MEMORY.md, unchanged). `/terminal/rental-drops` remains commented out of sidebar. Note added to `docs/HUMAN_ACTIONS_REQUIRED.md` for founder to investigate cron-job.org logs.

### Founder Actions Required
See `docs/HUMAN_ACTIONS_REQUIRED.md` for full list. New items from this cycle:
1. Trigger market briefing cron manually to populate `/terminal/market-briefing`: `POST /api/market-briefing/generate` Bearer CRON_SECRET
2. Investigate `rental_listings` 0-row issue — check cron-job.org logs for `/api/cron/fetch-listings`
3. Verify off-plan pipeline completion years: `SELECT COUNT(*) FROM dld_projects WHERE completion_date IS NOT NULL`

---

## 2026-03-24 — Phase 2 Autonomous Build Session (evening)

### Strategy Input
Read `docs/OVERNIGHT_STRATEGY_2026-03-24.md` — C-suite strategy council output. Extracted "Can Build Tonight" list (12 items). Mapped against existing codebase — several items were already complete from the prior session (market-briefing cron wrapper, sitemap with all terminal pages + community slugs, email capture on communities[slug], rate limiting on leads routes, metadata on all terminal pages except building-comparator which has a layout.tsx).

### What Was Built

#### A. Resend Email Delivery — `app/api/cron/weekly-distress-digest/route.ts`
- Installed `resend` npm package
- Replaced the `sendEmailToLead()` stub with a real Resend implementation
- Added graceful fallback: if `RESEND_API_KEY` is not set, logs and skips (never crashes)
- Generates proper HTML email with inline styles, brand header, and one-click unsubscribe link
- Unsubscribe token = `base64url(email)` — no HMAC needed for opt-out links
- From address: `North Capital DXB <digest@northcapitaldxb.com>` — domain must be verified in Resend
- Telegram message updated: reports `sent: N` vs `Email delivery inactive — add RESEND_API_KEY` depending on key presence
- Telegram error alert added to the catch block — silent failures now surface to Telegram

#### B. Unsubscribe Route — `app/api/leads/unsubscribe/route.ts` (NEW)
- `GET /api/leads/unsubscribe?token=<base64url-email>`
- Sets `unsubscribed_at = now()` on matching `email_leads` row
- Returns a clean HTML confirmation page (no external deps, no JS)
- Legally required before sending commercial email (CAN-SPAM / GDPR)
- Gracefully handles: missing token, invalid base64, email not found, already unsubscribed

#### C. New Terminal Page — `/terminal/developer-track` (NEW)
- `app/terminal/developer-track/page.tsx` — server component, `revalidate = 3600`
- Data source: `dld_projects` table (developer_name, no_of_units, project_status, area_name_en)
- Shows: total units, pipeline units (active/pending projects), total projects, finish rate (% completed)
- Stat cards: Developers Tracked, Top Developer, Avg Units/Developer, Total Ranked
- Responsive table: rank, developer name, total units, pipeline units + %, projects, finish rate %, top area
- `formatAreaName()` applied to top area column
- Full SEO metadata with canonical URL
- Added to sidebar nav: `components/terminal/sidebar.tsx` → Intelligence group, uses `Users` icon
- Added to `app/sitemap.ts` → `/terminal/developer-track`

#### D. Telegram Error Alerts — `app/api/cron/generate-market-briefing/route.ts`
- Added try/catch wrapper around the fetch call to the generate route
- On HTTP error or exception: fires Telegram alert to `TELEGRAM_THREAD_ID_CONTENT`
- Previously: wrapper had no error handling — a failed generate would return silently

### Pre-existing (confirmed, no change needed)
- Market briefing cron wrapper: `app/api/cron/generate-market-briefing/route.ts` — already existed from prior session
- Sitemap: already included all 12+ terminal pages + dynamic community slugs from `mv_txn_monthly`
- Email capture on communities[slug]: already present from prior session
- Rate limiting on leads routes: `lib/rate-limit.ts` already wired into email-capture
- Metadata: all terminal pages already had `export const metadata` or layout.tsx with metadata
- Building comparator: client component with `app/terminal/building-comparator/layout.tsx` exporting metadata

### Build Status
Clean — 0 TypeScript errors. 103 pages generated. `npm run build` ✅

### New Files
- `app/api/leads/unsubscribe/route.ts`
- `app/terminal/developer-track/page.tsx`
- `docs/HUMAN_ACTIONS_REQUIRED.md`

### Modified Files
- `app/api/cron/weekly-distress-digest/route.ts` — Resend wired in, error alert added
- `app/api/cron/generate-market-briefing/route.ts` — Telegram error alert added
- `components/terminal/sidebar.tsx` — Developer Track added to Intelligence group
- `app/sitemap.ts` — `/terminal/developer-track` added

### Founder Actions Required
Full list in `docs/HUMAN_ACTIONS_REQUIRED.md`. Top 3 blocking actions:
1. Create Resend account + add `RESEND_API_KEY` to Vercel env
2. Verify sender domain `northcapitaldxb.com` in Resend (SPF/DKIM DNS records)
3. Register weekly digest cron on cron-job.org: Monday 07:00 UTC, GET `/api/cron/weekly-distress-digest`, Bearer CRON_SECRET

---

## 2026-03-24 — Overnight Marketing Pipeline Build (autonomous session)

### What Was Built

#### Pipeline 1: Email Lead Capture + Weekly Digest

**`app/api/leads/email-capture/route.ts`**
- POST endpoint — validates email (regex, no deps), upserts `email_leads` with ON CONFLICT DO NOTHING
- Returns `{ ok: true, already_subscribed: bool }` so the widget can show the right state
- Fires Telegram notification to `TELEGRAM_THREAD_ID_LEADS` for every net-new lead
- Source + area_interest stored for segmentation (e.g. "community-page" + "Dubai Marina")

**`components/terminal/email-capture-widget.tsx`**
- Client component — idle / loading / success / already / error states
- Compact inline form, matches terminal dark aesthetic
- Dropped into two high-intent pages: distress-deals + community detail pages
- On community pages, `area_interest` is auto-populated with the area name the user is viewing

**`app/api/cron/weekly-distress-digest/route.ts`** — GET, Bearer CRON_SECRET
- Pulls top 5 confirmed distress deals (tier 1 priority, then tier 2, then DOM/PSF score fallback for last 7 days)
- Distress score computed inline from available columns: `ABS(dld_psf_delta_pct) * 0.7 + price_drop_pct * 0.5 + min(DOM/3, 40)`
- Generates 200-300 word email body via Gemini 2.5 Flash (`GEMINI_DISTRESS_API_KEY`)
- Email sending is STUBBED — `sendEmailToLead()` logs only; wire up SendGrid/Resend to activate
- Sends digest preview + lead count to Telegram after generation
- Updates `last_sent_at` and increments `send_count` for all active leads in one UPDATE

**`scripts/create-email-leads.mjs`** — migration: `email_leads(id, email, source, area_interest, subscribed_at, last_sent_at, unsubscribed_at, send_count)` — ran against Neon, table exists

#### Pipeline 2: Reddit Intelligence Enhancement

Reddit monitor already covers 13 subreddits as of prior session (DubaiExpats, dubai, AbuDhabi, UAE, expats, ExpatFinance, digitalnomad, ExpatFIRE, fatFIRE, HENRYfinance, Rich, RealEstateInvesting, PropertyInvestment). No further enhancement needed — the system already matches the spec's target subreddits and intent signals. Gemini-drafted replies sent to Telegram for copy-paste approval.

#### Pipeline 3: AI Weekly Market Briefing Generator

**`app/api/market-briefing/generate/route.ts`** — POST + GET, Bearer CRON_SECRET
- Pulls top 5 areas by sales volume + PSF (current month vs prior month from `dld_transactions`)
- Pulls distress summary: total_active, confirmed_drops, new_this_week, tier1_count
- Feeds structured data to Gemini 2.5 Flash with institutional analyst system prompt
- Output: MARKET SNAPSHOT / KEY SIGNALS / BEAR CASE NOTE / OPPORTUNITY (500 words max)
- Stores to `market_briefings(id, generated_at, content, data_snapshot, week_label, telegram_sent)`
- Sends 600-char preview to Telegram (uses `TELEGRAM_THREAD_ID_CONTENT`)

**`scripts/create-market-briefings.mjs`** — migration ran, table live

#### Pipeline 4: WhatsApp Intent Tracker

**`app/api/leads/whatsapp-intent/route.ts`** — POST
- Receives: `{ listing_id, title, location, price, psf, distress_score, area_benchmark_psf }`
- Inserts to `whatsapp_intents` table (best-effort, never blocks navigation)
- Fires Telegram alert with property details + "Someone just tapped Secure a Deal — follow up now"
- Uses `TELEGRAM_THREAD_ID_LEADS`

**`components/terminal/distress-feed-card.tsx`**
- Added `listingId?: string` to `DistressFeedCardProps`
- Added `fireWhatsAppIntent()` helper — fire-and-forget `fetch()` with `.catch(() => {})`
- WhatsApp CTA `onClick` calls `fireWhatsAppIntent(deal)` BEFORE browser navigates to wa.me link
- No await — navigation is never blocked

**`scripts/create-whatsapp-intents.mjs`** — migration ran, table live

### New DB Tables (all live in Neon)

| Table | Key Columns |
|---|---|
| `email_leads` | email UNIQUE, source, area_interest, subscribed_at, last_sent_at, send_count, unsubscribed_at |
| `market_briefings` | generated_at, content, data_snapshot JSONB, week_label, telegram_sent |
| `whatsapp_intents` | listing_id, title, location, price, psf, distress_score, area_benchmark_psf |

### Env Vars Needed to Activate Fully

| Var | Purpose | Status |
|---|---|---|
| `TELEGRAM_THREAD_ID_LEADS` | Thread for lead + WhatsApp intent alerts | Optional — falls back to main chat |
| `TELEGRAM_THREAD_ID_CONTENT` | Thread for market briefing previews | Optional — falls back to main chat |
| SendGrid/Resend API key | Actual email delivery for weekly digest | NOT YET — digest is stubbed |

### What the Founder Needs to Do in the Morning

1. **Register weekly digest cron** — cron-job.org → `GET https://northcapitaldxb.com/api/cron/weekly-distress-digest` — Bearer CRON_SECRET — Monday 7:00 AM UTC
2. **Register market briefing cron** — `POST https://northcapitaldxb.com/api/market-briefing/generate` — Bearer CRON_SECRET — weekly (Sunday night or Monday morning)
3. **Set `TELEGRAM_THREAD_ID_LEADS`** in Vercel env — create a dedicated Telegram thread for leads so they don't get lost in noise
4. **Pick email provider** — Resend is recommended (free tier 3k emails/mo). When key is available, replace `sendEmailToLead()` stub in `app/api/cron/weekly-distress-digest/route.ts` with real send call
5. **Test manually** — `curl -X POST https://northcapitaldxb.com/api/leads/email-capture -H 'Content-Type: application/json' -d '{"email":"test@test.com","source":"manual"}'` — should get `{ ok: true, already_subscribed: false }` and a Telegram notification

### Build Status
Clean — 0 TypeScript errors. All 4 pipelines compiled and included in the production build.

---

## 2026-03-23 (continued) — Area name branding layer

### Tasks Completed
1. **Created `lib/area-names.ts`** — shared utility with `DLD_TO_BRAND` map (57 entries), `formatAreaName()` function (case-insensitive lookup, falls back to original), and `DLD_AREAS` export
2. **Applied `formatAreaName()` to all terminal display surfaces**:
   - `app/terminal/communities/page.tsx` — `name` field in `mapToCommunity()` now uses brand name; slug stays as DLD name for URL routing
   - `app/terminal/communities/[slug]/page.tsx` — `<h1>` title and `generateMetadata` both use brand name
   - `app/terminal/area-momentum/page.tsx` — community column and stat card description
   - `app/terminal/yield-map/page.tsx` — stat card "Top Yield" description
   - `components/terminal/yield-map-table.tsx` — community column in table rows
   - `components/terminal/pricer-controls.tsx` — community column in table rows
   - `app/terminal/transaction-pulse/page.tsx` — no area names rendered; no change needed
3. **Build verified clean** ✅ — no TypeScript errors

### Note on PF naming cross-check
The `sample-api-return.json` is Bayut format (deprecated source). PF data arrives via `location_tree[level=1].name` into `distress_listings.area_name`, which is a separate table from the DLD terminal data. The `DLD_TO_BRAND` map targets DLD administrative names from `mv_txn_monthly`/`dld_transactions` — the correct source for all terminal pages updated.

---

## 2026-03-23 (continued) — Distress Deals snapshot cron + UI overhaul

### Tasks Completed
1. **`distress_listings` table created in Neon** — full schema with `canonical_key`, `snapshots` JSONB, `price_drop_confirmed`, `confidence_tier`, DLD enrichment columns, 5 indexes
2. **`/api/cron/snapshot-distress-listings` route created** — daily cron: fetches PF sale listings, upserts with price tracking, detects real price drops, re-listing matching via canonical_key, DLD PSF enrichment, marks disappeared listings, prunes expired rows
3. **Distress deals UI overhaul**:
   - Removed Bayut toggle (deprecated 2026-03-21)
   - Replaced "Book an Appointment" with "Secure a Deal" WhatsApp button
   - Each card now opens a detail modal (DealModal) with PSF vs market, score meter, CTAs
   - Feedback modal with lightbulb icon, CAPTCHA, Telegram integration
4. **Terminal UX improvements**: localStorage filter persistence, mobile sidebar auto-close, Yield Decay hidden, feedback modal
5. **Build verified clean** ✅

### Register Cron
- URL: `https://northcapitaldxb.com/api/cron/snapshot-distress-listings`
- Method: GET
- Header: `Authorization: Bearer CRON_SECRET`
- Schedule: Daily 6:30 AM UTC (30 min after main listings cron)

---

## 2026-03-23 — Distress Deals data accuracy strategy research

### Task
Researched the existing distress-deals implementation end-to-end and produced a complete strategy for replacing synthetic price-drop data with verifiable evidence.

### Key Findings
- `app/terminal/distress-deals/page.tsx`: all "original price" and "DROP %" values are fabricated using `(listing_id % 20) / 100` as a drop factor — no real price history exists
- `app/api/cron/telegram-distress-digest/route.ts`: daily Telegram digest also uses the same synthetic drop formula
- The Bayut API toggle in `DistressFilters` is dead code — Bayut was deprecated 2026-03-21
- The DLD PSF benchmark comparison (`fetchAreaBenchmarks`) already queries `dld_transactions` and is the only genuine signal currently in use

### Strategy Produced
Full strategy covers:
1. `distress_listings` table schema — snapshot store with `price_at_first_seen`, append-only `snapshots` JSONB, `price_drop_confirmed` boolean, `canonical_key` for re-listing detection, `dld_area_avg_psf` enrichment fields, `confidence_tier` (1/2/3), `retained_until` for 90-day pruning
2. Re-listing matching algorithm — `canonical_key` = normalize(building) + bedrooms + size_bucket(±50sqft) + type; match candidates that disappeared within 90 days; confidence score from 4 signals (area match, date gap, listing gap 1-30 days, price ≤ old price); threshold 0.5 for relisting flag, 0.7 to inherit price baseline and set `price_drop_confirmed = true` immediately
3. DLD enrichment SQL — batch UPDATE that joins `dld_transactions` on area+type+bedrooms to populate `dld_area_avg_psf` and `dld_psf_delta_pct`
4. Three confidence tiers: Tier 1 = we observed a real drop; Tier 2 = PSF is 10%+ below DLD 12-month avg; Tier 3 = DOM signal only
5. Cron pseudocode for `/api/cron/snapshot-distress` — fetch, mark disappeared, upsert with history, DLD enrichment, recompute scores, prune
6. UI changes: remove synthetic strikethrough price for Tier 3, add "Verified Drop" / "Below DLD Avg" badges, price history timeline in modal, replace header macro stats with truthful counts, add tier filter buttons, remove dead Bayut toggle

### Files to Create/Modify
- `app/api/cron/snapshot-distress/route.ts` — new cron route
- `app/terminal/distress-deals/page.tsx` — read from `distress_listings` instead of live API
- `components/terminal/distress-feed-card.tsx` — tier badges, history timeline, DLD block
- `components/terminal/distress-filters.tsx` — remove Bayut, add tier filter

---

## 2026-03-22 — AI video pipeline research: tools for automated data-driven social video

### Task
Researched and compared all tool categories needed for a fully automated "data to published short-form video" pipeline for northcapitaldxb.com — covering script generation, AI voiceover, AI avatars, stock footage APIs, video renderers, data visualization in video, and auto-publishing APIs. Produced structured report with recommended stack and cost model at 10 videos/week.

### Key Recommendation (full report in conversation)
Recommended stack: Gemini Flash (scripts, free) + ElevenLabs Creator tier (voiceover, $22/mo) + Shotstack (rendering, already integrated) + Pexels API (stock footage, free) + Remotion for data chart sequences + Ayrshare Premium ($99/mo) for unified publish to Instagram/TikTok/LinkedIn/YouTube. No AI avatar needed at first. Estimated cost: $7-12/video at 10/week including all APIs.

---

## 2026-03-22 — Blog OG image font, "More Insights" cards, cross-sell sidebar

### Tasks Completed

1. **`app/api/blog-og/route.tsx`** — Replaced generic `fontFamily: 'serif'` with Playfair Display Bold (brand font). Fetches the woff2 binary at request time via the Google Fonts CSS2 API and passes it to `ImageResponse` via the `fonts` option. Title now renders in Playfair Display 700 — matches brand headings exactly.

2. **`app/blog/[slug]/page.tsx`** — "More Insights" cards: replaced the `bg-accent/10` placeholder div with `BlogOgImage` component so every card always shows the dynamically-generated OG image when no `mainImage` is set. Image is now wrapped in a `relative aspect-[16/9]` container consistent with the `mainImage` path.

3. **`app/blog/[slug]/page.tsx`** — OG metadata: added `type: 'image/png'` to the `images` array in `openGraph` metadata so WhatsApp, Telegram, and other social parsers correctly identify the image format.

4. **`app/blog/[slug]/page.tsx`** — Added two cross-sell cards to the sticky sidebar:
   - **Dubai Market Terminal** — links to `/terminal` with BarChart2 icon and "Explore the data" CTA
   - **Ask on WhatsApp** — links to `wa.me/971554006230` with pre-filled message, styled with WhatsApp green

---

## 2026-03-22 — Adaptive blog prompt system + HowTo schema

### Tasks Completed

1. **`lib/ai-guidelines.ts`** — Added `BLOG_JSON_FORMAT_RULE` export. 5-type adaptive content classifier with SEO/AEO-optimised H2 templates per type (incorporates SEO auditor recommendations):
   - `INVESTMENT_ANALYSIS` — Macro Thesis / Bull Case / Bear Case / North Capital Verdict (unchanged)
   - `MARKET_DATA` — What the Data Shows / Trend Investors Are Missing / Investor Implication (required) / What This Means If You're Selling
   - `REGULATORY_NEWS` — What Changed + When / Who Is Affected / What to Do Before Deadline / Property Values & Yields / Who This Helps vs Hurts. Rule: every claim attributed to named authority + effective date.
   - `AREA_GUIDE` — Location Thesis / Rental Profile (yield, tenant mix, vacancy) / PSF Trajectory 3Y / Supply Pipeline Risk (required, with unit count + dates) / Who Should/Shouldn't Invest. Anti-lifestyle-drift rule.
   - `HOW_TO` — Pre-conditions / Steps as numbered H2s / Mistakes + AED cost figures. Scope-limited to AED 1M+ investor processes only.
   - Universal rules: 4+ FAQs with asset/area/metric name in question, excerpt under 155 chars with investment implication, 4 keyTakeaways with numbers, bear-equivalent required for all types.
   - JSON output now includes `contentType` field.

2. **`sanity/schemaTypes/post.ts`** — Added `contentType` field (list of 5 values, backend-only use) and `sourceUrl` field.

3. **`app/blog/[slug]/page.tsx`** — Added conditional `HowTo` JSON-LD schema for HOW_TO posts (extracts H2 blocks as `HowToStep` items). Injected alongside existing FAQPage + BlogPosting schemas. Added `contentType` to GROQ query.

4. **`app/api/ai-blog-generator/route.ts`** + **`app/api/blog-from-url/route.ts`** — Removed inline `jsonFormatRule`; now use shared `BLOG_JSON_FORMAT_RULE`. Store `contentType` from AI output to Sanity doc (validated against allowlist).

---

## 2026-03-22 (Sprint 9) — Session wrap-up: area-momentum fix + full build verified

### Tasks Completed

1. **`app/terminal/area-momentum/page.tsx`** — Fixed runtime crash: postgres.js returns NUMERIC columns as JS strings; `.toFixed()` and arithmetic on raw values threw at runtime. Fixed by:
   - Coercing all numeric fields via `.map()` after `areas.slice(0, 60)` — explicit `Number()` on `curr_psf`, `price_mom_pct`, `curr_vol`, `vol_mom_pct`, `momentum_score`
   - Updated `pct()` and `volPct()` helpers to accept `number | string` and call `Number(val)` internally
   - Updated `AreaRow` interface fields to `number | string`

2. **Build verified** — `npm run build` passes clean. All 9 terminal pages compile: `area-momentum`, `building-comparator`, `communities`, `distress-deals`, `floor-plan-pricer`, `price-index`, `rental-yield-decay`, `supply-pipeline`, `transaction-pulse`, `yield-map`.

---

## 2026-03-22 — Floor Plan Pricer terminal page

### Tasks Completed

1. **`app/terminal/floor-plan-pricer/page.tsx`** — Server component. Runs `fetchPricerData` against `dld_transactions` using PERCENTILE_CONT to compute P10/P25/P50/P75/P90 per `area_name_en` x `rooms_en`, 24-month rolling window, sales only, min 20 txns. Summary stat cards (communities, room types, total transactions). Passes full dataset as props to `PricerControls`. `export const revalidate = 3600`.

2. **`components/terminal/pricer-controls.tsx`** — Client component. Area search (case-insensitive contains). Room pills: All / Studio / 1 B/R / 2 B/R / 3 B/R / 4 B/R+ (4+ matches 4-7 B/R + PENTHOUSE). Table: Community, Bedrooms, P10 (muted), P25, Median P50 (bold emerald), P75, P90 (muted), Fair Value Band badge (emerald pill), Distribution bar (xl+ only), Txns. Distribution bar is pure CSS — emerald fill P25–P75, bright P50 dot, positions as % of (v − P10) / (P90 − P10). No extra chart library.

3. **`components/terminal/sidebar.tsx`** — Added `Ruler` to lucide-react imports. Added `{ href: '/terminal/floor-plan-pricer', label: 'Floor Plan Pricer', icon: Ruler }` after Area Momentum.

---

## 2026-03-22 (Sprint 8) — Building Comparator terminal page

### Tasks Completed

1. **`app/api/building-search/route.ts`** — GET `/api/building-search?q=...` typeahead. Queries `dld_transactions` for distinct `building_name_en` ILIKE match, Sales only, returns up to 15 results with `area_name_en`.

2. **`app/api/building-data/route.ts`** — GET `/api/building-data?a=...&b=...`. Returns `quarterly` (3yr avg PSM per quarter per building, with deal count and nearest metro) and `serviceCharges` (annual residential service cost from `dld_service_charges`).

3. **`app/terminal/building-comparator/page.tsx`** — Full `"use client"` page. Dual debounced typeahead search boxes (Building A + optional Building B). Recharts `LineChart` with emerald/blue dual lines for PSM trend. Stats grid (nearest metro, latest PSM, 3yr deal count, avg quarterly deals). Service charges table cross-referencing both buildings by year.

4. **Sidebar** (`components/terminal/sidebar.tsx`) — Added `Building2` import and `{ label: "Building Comparator", href: "/terminal/building-comparator", icon: Building2 }` after Service Charges.

---

## 2026-03-22 (Sprint 7) — Rental Yield Decay terminal page

### Tasks Completed

1. **`/terminal/rental-yield-decay`** — New server component page (`app/terminal/rental-yield-decay/page.tsx`). Runs the 3-year quarterly yield query against `mv_txn_monthly`. Computes stat cards: areas below 5% threshold, average current yield, most compressed area+bedroom combo. `revalidate = 3600`.

2. **`components/terminal/yield-decay-controls.tsx`** — Client component with area dropdown (sorted by transaction volume), room-type pills (Studio / 1 B/R / 2 B/R / 3 B/R / All). Recharts `LineChart` with a red dashed `ReferenceLine` at y=5 labeled "Risk-Free 5%". Lines color-coded: Studio=indigo, 1BR=emerald, 2BR=yellow, 3BR=orange. Table below chart ranks all areas by latest yield with a red dot flag on rows below 5%, and shows 1yr change in percentage points.

3. **Sidebar** (`components/terminal/sidebar.tsx`) — Added `TrendingDown` import and `{ label: "Yield Decay", href: "/terminal/rental-yield-decay", icon: TrendingDown }` entry after Building Comparator.

---

## 2026-03-22 (Sprint 6) — Admin panel revamp + URL-to-blog pipeline + Telegram inbound

### Tasks Completed

1. **Admin panel revamped** with shared layout + sidebar (`components/admin/admin-shell.tsx`). Single passcode login at `/admin/login` sets an `HttpOnly` cookie (`admin_auth`, 8h). All child pages are protected by `app/admin/layout.tsx` (server-side redirect if no valid cookie).

2. **`/admin/import`** — Removed passcode field. Auth now from cookie. API route (`/api/project-pdf-upload`) updated to check cookie via `cookies()` from `next/headers` instead of formData passcode.

3. **`/admin/blog-from-url`** — New admin page. Paste any article URL → Gemini reads it → creates Sanity draft.

4. **`/api/blog-from-url`** — New route. Accepts cookie auth (admin UI) or `BLOG_GENERATOR_SECRET` (programmatic/Telegram). Fetches URL, strips HTML to plain text (8k char cap), runs Gemini 2.5 Flash with same editorial rules as ai-blog-generator, creates Sanity draft post.

5. **`/api/telegram-webhook`** — New route. Verifies `x-telegram-bot-api-secret-token` header. Detects URLs in incoming DMs to the bot. Acknowledges, calls `/api/blog-from-url` internally, replies with Sanity Studio link on success.

### Remaining setup (user action required)
- Add `TELEGRAM_WEBHOOK_SECRET` and `NEXT_PUBLIC_SITE_URL` to Vercel env vars
- After deploy, register webhook: `https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://northcapitaldxb.com/api/telegram-webhook&secret_token={TELEGRAM_WEBHOOK_SECRET}`

---

## 2026-03-21 (Sprint 5) — Fixed communities slug 404

### Tasks Completed

1. **Fixed `/terminal/communities/[slug]` returning 404**: `fetchAreaData()` in `app/terminal/communities/[slug]/page.tsx` was querying non-existent columns `m.avg_price_sqm` and `m.avg_price`. The query silently errored, returning `null`, triggering `notFound()`. Fixed by replacing with the correct Neon `mv_txn_monthly` column names: `avg_psf` and `avg_value`. The `/10.764` PSM→PSF conversion is preserved (Neon stores `avg_psf` as AED/sqm despite the name). All three query occurrences fixed (curr CTE, prev CTE, price history query).

---

## 2026-03-21 (Sprint 4) — Supabase fully deprecated, Neon migration complete

### Tasks Completed

1. **Confirmed Neon state**: 1.66M dld_transactions, 1.27M dld_units, mv_txn_monthly already existed with correct schema (avg_psf, median_psf, area_id, rooms_en etc.) and data. Neon is more complete than Supabase.

2. **Created missing tables in Neon**: `rental_listings` (dropped old wrong-schema version, recreated with correct columns: id text pk, source, cluster, area, type, bedrooms, annual_price, monthly_price, price_per_sqft, external_url, listed_at, raw jsonb), `reddit_seen_posts`, `reddit_voice_samples`.

3. **Migrated 3 remaining Supabase routes to lib/db.ts (Neon)**:
   - `app/api/cron/fetch-listings/route.ts` — upsert rental_listings via postgres.js
   - `app/api/communities/stats/route.ts` — reads rental_listings via sql``
   - `app/api/reddit-monitor/route.ts` — reads/writes reddit_seen_posts, reddit_voice_samples, rental_listings via sql``

4. **Deleted lib/supabase.ts and lib/supabase-server.ts** — no remaining Supabase JS client imports in app/.

5. **Migration script**: `scripts/migrate-remaining-to-neon.ts` saved for reference.

**All app routes now use Neon exclusively via lib/db.ts.**

---

## 2026-03-21 (Sprint 3) — Phase 1 video pipeline built (Shotstack distress Shorts)

### Tasks Completed

1. **`/api/distress-video`** — New route. Fetches top distress deal (PropertyFinder, sorted by days on market, filtered to deals with images). Renders a 15s 9:16 MP4 via Shotstack: property image background (zoomIn + dark filter) + full HTML overlay (DISTRESS DEAL badge, title, location, AED price in emerald, sqft/psf/DOM detail, CTA). Polls until done (90s max). Sends video download URL + listing link via Telegram on completion. Fires `sendTelegramError` on Shotstack submit/poll failure. maxDuration=120.

2. **`/api/cron/generate-video-shorts`** — Cron wrapper (GET, Bearer CRON_SECRET). Calls `/api/distress-video` internally. maxDuration=60. Ready to add to cron-job.org.

3. **New env var required**: `SHOTSTACK_API_KEY` — add to Vercel environment variables.

---

## 2026-03-21 (Sprint 2) — Debug endpoint deleted, mv_txn_monthly created, mobile table fixes

### Tasks Completed

1. **Deleted `/api/debug/rental-raw`** — temporary debug endpoint removed entirely.

2. **Lead form audit** — `/api/contact` is wired up correctly: writes to Google Sheets (Sheet1!A:J) and fires a Telegram notification. No fix needed.

3. **ISR caching** — `/projects` and `/blog` both already have `export const revalidate = 60`. No change needed.

4. **`mv_txn_monthly` created** — Materialised view on `dld_transactions` aggregating by month, area, trans_group, property_type, property_sub_type. Columns: txn_count, total_value, avg_price, avg_price_sqm, avg_rent, avg_rent_sqm, avg_area_sqm. Unique index + 3 supporting indexes created. pg_cron enabled, nightly refresh scheduled at 02:00 UTC. This unblocks all Phase 2 terminal pages.

5. **Mobile table overflow fixed** — Added `sticky left-0 z-10 bg-card` to first column (Project Name) in both `service-charges-table.tsx` and `supply-pipeline-table.tsx`. Restructured service charges outer div to match supply pipeline's `overflow-hidden` > inner `overflow-x-auto` pattern so sticky positioning works correctly.

---

## 2026-03-21 — API cleanup, key isolation, Bayut discontinued, cron wiring fixed

### Tasks Completed

1. **Blog pipeline confirmed working** — `ai-blog-generator` test via Gmail label succeeded end-to-end. Sanity draft created at `/blog/dubai-transaction-analysis-march-2026-primary-market-captures-74-of-capital-flow`.

2. **API route renames** (descriptive names, all committed):
   - `ai-x-post-generator` → `distress-xpost`
   - `ai-project-generator` → `project-pdf-email`
   - `manual-project-import` → `project-pdf-upload`
   - `ai-linkedin-post-generator` → `distress-linkedin`

3. **Gemini key isolation** — 3 separate keys now, each scoped to a function:
   - `GEMINI_BLOG_API_KEY` → `ai-blog-generator`, `ai-blog-to-xpost`
   - `GEMINI_DISTRESS_API_KEY` → `distress-xpost`, `distress-linkedin`
   - `GEMINI_PDF_API_KEY` → `project-pdf-email`, `project-pdf-upload`

4. **Bayut discontinued** — removed from `distress-xpost` and `distress-linkedin`. PropertyFinder only. Bayut's RapidAPI data quality not reliable enough for real-time use.

5. **distress-xpost improvements** — USP prompt now requires `[Avg: AED X/sqft | Listing: AED Y/sqft]` bracket, `pricePerSqft` computed per listing, location added as dedicated line in post text.

6. **Hardcoded secrets eliminated** — all `NORTHCAPITAL_SUPER_SECRET_KEY_2026` replaced with env vars. Secret routing:
   - `CRON_SECRET` → distress-xpost, distress-linkedin, reddit-monitor (cron-job.org)
   - `BLOG_GENERATOR_SECRET` → ai-blog-generator, project-pdf-email (Apps Script)
   - `ADMIN_PASSCODE` → project-pdf-upload (manual form)

7. **Cron wrapper routes fixed** — `/api/cron/generate-x-posts` and `/api/cron/generate-linkedin-posts` updated to call new internal route names and forward `CRON_SECRET` from env. cron-job.org URLs unchanged.

8. **ai-blog-to-xpost** — title and hashtags now in `<code>` blocks for one-tap copy in Telegram.

### Files Changed
- `app/api/distress-xpost/route.ts` — rewrite: PF only, pricePerSqft, USP prompt, new key
- `app/api/distress-linkedin/route.ts` — PF only, pricePerSqft in context, new key
- `app/api/project-pdf-email/route.ts` — new key, correct secret (BLOG_GENERATOR_SECRET)
- `app/api/project-pdf-upload/route.ts` — new key
- `app/api/ai-blog-to-xpost/route.ts` — code blocks for title + hashtags
- `app/api/cron/generate-x-posts/route.ts` — updated internal URL + secret
- `app/api/cron/generate-linkedin-posts/route.ts` — updated internal URL + secret

### Env Vars Added to Vercel
- `GEMINI_DISTRESS_API_KEY` (same value as GEMINI_API_KEY)
- `GEMINI_PDF_API_KEY` (new key: AIzaSyCD66...)

### Pending
- Add `GEMINI_DISTRESS_API_KEY` and `GEMINI_PDF_API_KEY` to `.env.local`
- Rotate Supabase PAT that was previously in `.mcp.json`
- Publish Sanity draft from blog pipeline test
- Add `TELEGRAM_THREAD_ID_SMM_QUEUE` env var and run `npm run heartbeat` for first test

---

## 2026-03-21 — Product Marketing Context: Full rewrite for North Capital DXB

### Task
Rewrote `docs/product-marketing-context.md` with accurate, current information. Previous version (March 2026-03-05) was a reasonable first draft but lacked live metrics, real case studies, persona specifics, and the Terminal as a distinct product section.

### Key Changes
- Added **The Terminal** as a standalone section — describes all 5 live pages, data sources (DLD), row counts, and how the terminal feeds the advisory funnel
- Updated all metrics with live website figures: 7.2–9.5% net yield, AED 522B 2024 transaction volume, population projection 3.7M → 5.8M by 2040, AED 1.2M+ entry, AED 2M Golden Visa threshold
- Added real case studies: Emaar Beachfront (+81% net appreciation), Marina Gate (9.2% net yield, AED 185k/yr), District One Villas (AED 12.5M → 19M in 14 months)
- Added Golden Visa Buyer as a fourth persona
- Expanded Customer Language section with verbatim phrases from website and persona research
- Added Active Marketing Channels table (terminal SEO, blog, LinkedIn, Reddit, Telegram)
- Added Glossary with product-specific terms (DLD Benchmark, One-Price Advantage, Distress Deal, etc.)
- Replaced placeholder proof points with actual credentials: RERA #95133, Aeon & Trisl partnership, terminal data scale
- Added founder quote from live website

### Files Changed
**`docs/product-marketing-context.md`** — Full rewrite.

---

## 2026-03-21 — Co-Founder Heartbeat: Autonomous backlog + marketing content pipeline

### Task
Built an autonomous heartbeat script (co-founder agent). Reads mission, todo.md, and DAILY_LOG, generates 10 product tasks + 8 ready-to-post marketing drafts via Claude Haiku, sends both to Telegram SMM queue thread, writes a dated backlog file to state/.

**Files:** `docs/MISSION.md`, `state/cofounder.json`, `scripts/cofounder-heartbeat.ts`
**Usage:** `npm run heartbeat` — or configure cron-job.org to call it every 2-3 days

---

## 2026-03-21 — Sales Discovery Coach Skill Added (North Capital DXB)

### Task
Fetched `sales/sales-discovery-coach.md` from `msitarzewski/agency-agents` and adapted it for North Capital DXB property advisory calls. Removed all SaaS/B2B discovery framing. Rebuilt the entire methodology around Dubai real estate buyer qualification.

### Key Adaptations
- Defined three buyer archetypes as the primary qualifying framework: Golden Visa Buyer (AED 2M+ threshold), Yield Investor, and End-User/Self-Occupier — each with distinct signals, data narratives, and urgency drivers
- Added a DLD Data Qualification Questions section covering `dld_transactions`, `dld_price_index`, `dld_service_charges`, and `dld_projects` as mid-call advisory tools
- Built a Red Flag Signals table specific to Dubai (budget at AED 2M threshold, no mortgage pre-approval, prior off-plan negative experience, absent decision-maker)
- Adapted the Objection Handling table to Dubai-specific objections: market overheating concerns, off-plan payment plan comparisons, Golden Visa regulatory uncertainty
- Preserved the upfront contract structure, 60/40 talk ratio rule, and AECR objection framework — these are methodology-agnostic and still apply
- Coaching principles rewritten to emphasise data-led advisor positioning vs. listing-pusher dynamic

### Files Changed
**`.agent/skills/sales-discovery-coach.md`** — Created. Adapted from `msitarzewski/agency-agents/sales/sales-discovery-coach.md`.

---

## 2026-03-21 — Sales Deal Strategist Skill Added (North Capital DXB)

### Task
Fetched `sales/sales-deal-strategist.md` from `msitarzewski/agency-agents` and adapted it into a Dubai secondary market deal strategy agent. Removed all B2B/enterprise/MEDDPICC/Challenger Sale framing. Replaced with a six-dimension qualification framework anchored to DLD registered transaction data, full landed-cost modelling (buyer and seller), and a distress scoring system built from observable listing signals (DOM, price cuts, PSF vs. P25).

### Files Changed

**`.agent/skills/sales-deal-strategist.md`**
- Six qualification dimensions: Price-to-DLD Benchmark, Distress Score (0-10 composite), Transaction Cost Clarity, Golden Visa Eligibility, Seller Motivation, Title and Legal Clarity.
- Full landed cost breakdowns for cash and mortgage buyers; net proceeds model for sellers including NOC, service charge arrears, and early settlement fees.
- Golden Visa structuring notes: AED 2M threshold, equity vs. value distinction for mortgaged properties, offplan paid-amount rule.
- DLD-anchored offer construction: P25 PSF opening, median PSF walk-away, floor/view normalisation, distress discount bands.
- Concession strategy: decreasing-increment concessions with non-price terms (NOC fee, service charge contribution, completion date flexibility).
- MOU structuring table covering deposit, completion period, NOC responsibility, service charge arrears, tenancy, and default penalty.
- Red flags specific to Dubai: blocked NOC, bank valuation gap, expired AIP, sub-assignment no-transfer clause, unauthenticated POA.
- Deal assessment template with DLD comparable transaction table, cost model, and offer strategy block.

---

## 2026-03-21 — Image Prompt Engineer Skill Added (North Capital DXB)

### Task
Fetched `design/design-image-prompt-engineer.md` from `msitarzewski/agency-agents`. Adapted it fully for North Capital DXB image generation use cases with a Bloomberg-terminal / Palantir / institutional-dark-mode aesthetic. Replaced all generic lifestyle/fashion/portrait examples with five North Capital DXB-specific output types.

### Files Changed

**`.agent/skills/design-image-prompt-engineer.md`**
- Created from upstream agency-agents source.
- Defined five use cases: property listing hero images (architectural photography), data visualisation thumbnails, Dubai area photography, terminal-style social graphics, dark-theme dashboard UI mockups.
- Enforced brand colour system (emerald `#10b981`, near-black `#0a0a0a`, cool grey palette) across all prompt templates.
- Genre-specific prompt patterns for each use case with full negative prompt lists banning luxury lifestyle and stock-photo aesthetics.
- Platform-specific optimisation notes for Midjourney, DALL-E 3, Stable Diffusion/SDXL, and Flux.
- Reference photographer/style anchors: Hufton+Crow, Iwan Baan, Bloomberg Businessweek data graphics, Pentagram information design.
- Four complete example prompt templates: architectural hero, data vis thumbnail, yield stat social card, dashboard UI mockup.
- Three advanced North Capital DXB-specific patterns: distress deal visual, transaction volume chart thumbnail, Creek Harbour pipeline photography.

---

## 2026-03-21 — LinkedIn Content Creator Skill Added (North Capital DXB)

### Task
Fetched the source `marketing-linkedin-content-creator.md` from `msitarzewski/agency-agents` (marketing/ subdirectory) and adapted it for North Capital DXB. Stripped all generic B2B SaaS / startup framing. Replaced voice profile, hooks, content pillars, and success metrics with Dubai real estate data terminal context. Enforced no-exclamation-mark rule and data-first posture throughout. Named data sources (DLD, Bayut, PropertyFinder, REIDIN, CBRE, Knight Frank) as required citations for every post.

### Files Changed

**`.agent/skills/marketing-linkedin-content-creator.md`**
- Created from upstream agency-agents source.
- 5 content pillars: DLD Data Drops, Yield and Pricing Analysis, Market Structure and Signals, Frameworks and Decision Tools, Contrarian and Corrective Takes.
- 5 hook types grounded in data specificity, not emotion.
- 4 post templates: Data Drop, Analysis, Framework, Contrarian Take each with explicit structure and formatting rules.
- 30-day content calendar, 10-slide carousel architecture, profile optimisation framework treating LinkedIn as a data room.
- Data sources reference table with 7 named sources and update frequencies.
- 90-day success metrics with save rate weighted at 3x likes.

---

## 2026-03-21 — Podcast Strategist Skill Added (North Capital DXB)

### Task
Fetched `marketing/marketing-podcast-strategist.md` from `msitarzewski/agency-agents` (file was in the `marketing/` subdirectory, not the repo root). Adapted it for North Capital DXB — stripped all Chinese platform operations (Xiaoyuzhou, Ximalaya, WeChat, Jike, Douyin) and replaced with a Dubai investor-grade podcast strategy grounded in DLD open data.

### Key Adaptations
- Repositioned from "companionship audio content" to "Planet Money for Dubai real estate" — data brief + narrative layer format per episode
- Defined four listener personas (active investor, expat buyer, landlord, broker/advisor) with specific information needs mapped to each
- Built four episode types anchored to DLD data: weekly data brief, area deep-dive (using `dld_transactions`, `dld_price_index`, `dld_service_charges`, `dld_projects`), distress deal analysis, and regulatory response episodes
- Replaced Chinese platform ops with Spotify/Apple Podcasts/Anghami + LinkedIn clip + Telegram post repurposing workflow
- Added strict guest qualification rules (no agent marketing reps; guests must bring proprietary data, regulatory authority, or deal-level investor experience)
- Stage-gated monetization: no ads for first 50 episodes, then selective PropTech/financial services sponsors only — no developer-sponsored analysis ever
- Replaced Chinese success metrics with Dubai-specific analytics targets and a 12-month success definition tied to terminal conversion and organic broker sharing

### Files Changed
**`.agent/skills/marketing-podcast-strategist.md`** — Created adapted skill file. Includes: show positioning framework, four episode type definitions, full production workflow, distribution playbook, episode brief template, analytics targets, editorial standards, and communication style guide.

---

## 2026-03-21 — Marketing Growth Hacker Skill Added

### Task
Fetched the upstream `marketing/marketing-growth-hacker.md` from `msitarzewski/agency-agents` and adapted it for North Capital DXB. Replaced all generic SaaS acquisition framing with the product's actual model: free data terminal driving leads for broker advisory services. Removed viral loop / K-factor / CAC-LTV metrics that do not apply. Built the agent around the four active organic channels (SEO, Reddit, Telegram, LinkedIn) with operating models for each. Added an ICE-scored experiment framework with a documented log format, a five-stage funnel model with instrumentation priorities, and a content principles section enforcing the terminal's data-first, institutional-tone positioning.

### Files Changed

**`.agent/skills/marketing-growth-hacker.md`**
- Created new skill file adapted from agency-agents source.
- Four channel operating models (SEO, Reddit, Telegram, LinkedIn) with target intent, content types, cadence, and measurement.
- Hypothesis-driven experiment framework with ICE scoring and a structured log format.
- Five-stage funnel model: Discovery → Terminal Session → Repeat Visit → Community Sign-up → Consultation Booked.
- Success metrics table calibrated to organic channel reality (not VC-growth benchmarks).
- Anti-patterns section calling out community-channel misuse and vanity metric traps.

---

## 2026-03-21 — Add product-feedback-synthesizer agent skill (North Capital DXB)

### Task
Fetched `product/product-feedback-synthesizer.md` from `msitarzewski/agency-agents` and adapted it into a North Capital DXB-specific feedback processing agent. Strips generic UX-research framing; replaces it with a ruthless prioritisation system for a solo founder + Claude Code workflow.

### Files Changed

**`.agent/skills/product-feedback-synthesizer.md`**
- Five feedback channels defined with explicit bias notes: Telegram, Reddit (r/DubaiExpats, r/dubai), broker calls, WhatsApp Community, direct email.
- 3-axis scoring (Signal Strength, Founder Effort, Revenue Relevance) → Priority Score formula → disposition mapping to roadmap phases or data gap flags.
- Six hard prioritisation rules: data-first, kill mock data before new features, phase gates, broker signals 2:1, no feature without named data source, UX friction before new features.
- Trust signal handling distinguishes data integrity issues (P0) from messaging gaps.
- Worked example maps a Reddit rental-yield question to Phase 2 yield-map page.

---

## 2026-03-21 — Behavioral Nudge Engine Skill Added

### Task
Fetched the source `product-behavioral-nudge-engine.md` from `msitarzewski/agency-agents` (located at `product/` subdirectory) and adapted it for North Capital DXB. Stripped all SaaS/e-commerce framing, replaced with property decision behavioral economics. Defined four precise nudge contexts (depth explorer, distress deal viewer, area screener, 3rd-visit return user) each grounded in a specific behavioral principle (loss aversion, anchoring, commitment/consistency, reciprocity). Added TypeScript nudge resolution logic, a dismissal persistence model, and a success metrics table. Enforced no-dark-patterns constraint throughout.

### Files Changed

**`.agent/skills/product-behavioral-nudge-engine.md`**
- Created new skill file adapted from agency-agents source.
- Four nudge contexts with trigger conditions, timing rules, copy principles, and example prompts.
- NudgeContext TypeScript schema + priority-ordered resolution function.
- Behavioral economics principles table mapping each principle to a specific DXB terminal context.
- Success metrics: nudge-to-booking rate, session depth at conversion, dismissal rate by context, area nudge specificity lift.

---

## 2026-03-21 — Add engineering-database-optimizer agent skill (North Capital DXB)

### Task
Fetched the upstream `engineering-database-optimizer.md` from `msitarzewski/agency-agents` and adapted it for the North Capital DXB stack. Replaced all generic and MySQL/PlanetScale examples with project-specific ones: `dld_transactions`, `mv_txn_monthly`, `rental_listings`, Supabase transaction pooler (port 6543), and CONCURRENTLY-safe index/migration patterns. Preserved the original agent structure (Identity, Core Mission, 7 deliverable sections, Critical Rules, Communication Style).

### Files Changed

**`.agent/skills/engineering-database-optimizer.md`**
- Created from scratch (adapted from upstream source).
- Sections: schema design for DLD tables, EXPLAIN ANALYZE patterns, `mv_txn_monthly` definition + refresh strategy, N+1 elimination in server components, Supabase pooler mode guide (transaction vs session), safe migrations for 1M+ row tables, slow query detection via `pg_stat_statements`.
- All 10 critical rules are project-specific (no generic advice).

---

## 2026-03-21 — Communities Screener: Sparkline Graph, Data Cleanup & Agent Expansion

### Task
Replaced the 'Yield' column with an interactive 'Trend (1Y)' SVG sparkline. Abstracted the Community interface and removed `mock-communities.ts` fake data. Ported 6 specialized marketing & UX agents into the system and refactored them for the North Capital DXB persona.

### Files Changed

**`lib/mock-communities.ts`**
- Deleted the file and fake data array.
- Moved the `Community` TypeScript interface to `lib/types/community.ts` and added `priceHistory`. 

**`app/terminal/communities/page.tsx`**
- Replaced the import path to `lib/types/community.ts`.
- Updated the main `fetchCommunities` SQL query with a CTE to aggregate 11 prior months of `avg_psm` into a JSON array, yielding a trailing 12-month price history.

**`components/terminal/communities-table.tsx`**
- Replaced the import path to `lib/types/community.ts`.
- Deleted `YieldBadge` and built a new `MiniSparkline` functional component inside the file using a responsive SVG `<polyline>` spanning 60x24px with red/emerald stroke depending on 1Y performance.
- Swapped the `grossYield` column for `priceHistory`, calculating exact percentage sorting using the first and last element of the payload array.

**`.agent/skills/*`**
- Ported 6 new specialized agents (`marketing-xiaohongshu-specialist`, `marketing-carousel-growth-engine`, `testing-accessibility-auditor`, `paid-media-tracking-specialist`, `ux-researcher`, `marketing-wechat-official-account`) from `agency-agents`.
- Modified internal prompts extensively to restrict their tone strictly to the North Capital DXB institutional-grade persona without whimsy or fluff.

---
## 2026-03-20 — Deploy Announce: Automated Telegram SMM on feature rollout

### Task
Standalone CLI script — calls Claude Haiku + Telegram directly (no API route needed, initiated from Claude Code). Generates 3 conversion-focused messages on deploy.

### Files Changed

**`scripts/announce-deploy.ts`**
- Calls Claude Haiku directly with Dubai-investor system prompt → 3 messages: teaser, benefit, CTA
- `mode=queue` (default): msg 1 → channel now, msgs 2+3 → `TELEGRAM_THREAD_ID_SMM_QUEUE` as a draft block
- `mode=immediate`: all 3 → channel, 4s stagger
- Prints stripped preview to console

**`package.json`**
- Added `"announce-deploy": "npx tsx scripts/announce-deploy.ts"`

### New env var (optional)
- `TELEGRAM_THREAD_ID_SMM_QUEUE` — topic thread for queued drafts

### Usage
```bash
npm run announce-deploy -- "Price Index chart" "YoY stat cards" --url /terminal/price-index
npm run announce-deploy -- "Distress Deals V2" --mode immediate
```

---

## 2026-03-15 — Communities Page: Mock Data Replaced with Real DLD Data

### Task
Replaced 100% mock data on `/terminal/communities` with live DLD data queried from `mv_txn_monthly` and `dld_projects` via `lib/db` pooled postgres.js.

### Files Changed

**`app/terminal/communities/page.tsx`**
- Removed `MOCK_COMMUNITIES` import and internal fetch to `/api/communities/stats`
- Added `import { sql } from "@/lib/db"` and `type Community` import
- Added `CommunityRow` type, `toSlug()`, and `mapToCommunity()` helpers
- Added `fetchCommunities()` — runs the `mv_txn_monthly` + `dld_projects` SQL query with try/catch (returns empty array on error)
- SQL: computes `curr` and `prev` month weighted-average PSF, `supply` pipeline from `dld_projects`, MoM % change, and PSF conversion (÷ 10.764 AED/sqm → AED/sqft); filters to `txn_count >= 5`, `LIMIT 80`
- Header count now shows `data.length` (live)
- Replaced Avg/Top Yield stat cards with "Areas Tracked" and "Avg AED/sqft" (yield not available from DLD)
- Data disclaimer now reads "Source: Dubai Land Department — Feb 2026 transactions"
- Table now receives live `data` (not `MOCK_COMMUNITIES`)

**`components/terminal/communities-table.tsx`**
- `YieldBadge`: early return `—` when value is 0
- DOM cell: renders `—` when value is 0 (field unavailable from DLD)
- Units cell: renders `—` when `totalUnits === 0`

### Build Status
Compiled successfully. All 128 pages generated without errors.

---

## 2026-03-15 — Distress Deals V2

### Task
Implemented distress deals v2 across 3 files to replace 100% synthetic `originalPrice` with real DLD benchmark data and a distress scoring system.

### Files Changed

**`app/terminal/distress-deals/page.tsx`**
- Added `import { sql } from "@/lib/db"`
- Added `isOffplanDrop` field to `fetchBayutDeals` return (true when offplan original price used)
- Added `isOffplanDrop: false` to `fetchPropertyFinderDeals` return
- Added `fetchAreaBenchmarks()` — queries `dld_transactions` for area avg PSF over 18 months, graceful fallback to empty Map
- Added `matchBenchmark()` — fuzzy contains match on comma-separated location parts vs benchmark area names
- Added `getDomTier()` — bins days-on-market into fresh/aging/stale/overdue
- Added `scoreDistress()` — composite score (0-100) from DOM tier, PSF vs benchmark, and offplan cut signal
- Server component now runs `fetchAreaBenchmarks()` in parallel with the API fetch via `Promise.all`
- Enriches each deal with `psf`, `areaBenchmarkPsf`, `distressScore`, `distressTags`, `domTier`
- Extracts `communities` (unique sorted community names) before area filter
- Applies `areaFilter` searchParam filter
- Computes `areaStats` (top 6 communities by deal count with avg DOM and top score)
- Added Area Intelligence section between filters and feed grid (renders when `areaStats.length >= 2`)
- Passes `communities` prop to `<DistressFilters>`
- Passes enriched fields to `<DistressFeedCard>`

**`components/terminal/distress-feed-card.tsx`**
- Added `psf`, `distressScore`, `distressTags`, `areaBenchmarkPsf`, `domTier`, `isOffplanDrop` to props interface
- DOM badge now color-coded by tier (fresh=muted, aging=yellow, stale=orange, overdue=red)
- Signal tags rendered after DOM badge (OVERDUE 90D, HIGH DOM, AGING, BELOW MARKET, OFFPLAN CUT)
- PSF line added below current price, with area avg comparison highlighted in accent when 5%+ below market
- Distress score badge added below percentage drop badge, color-coded red/orange/yellow by severity

**`components/terminal/distress-filters.tsx`**
- Added `communities?: string[]` prop
- Added `activeArea` state from searchParams
- Added area dropdown after sort dropdown (hidden when communities array is empty)

### Build Status
Compiled successfully. Pre-existing build timeout on `/terminal/communities` and `/terminal/rental-drops` (Phase 2 pages making external API calls at static export time — unrelated to this task).

---

## 2026-04-07 — Bayut14 Integration (Transaction freshness bridge)

### Goal
Bridge the DLD data staleness gap (stale at Feb 17, 2026) using Bayut14 RapidAPI transactions.

### New Files
**`scripts/migrate/005_bayut_integration.ts`**
- Creates `bayut_transactions` table (PK = `transaction_hash_id`)
- Creates `area_name_mapping` table with 30 Bayut→DLD community name mappings
- Creates `bayut_ingest_log` table for budget tracking
- Creates `mv_txn_monthly_unified` materialized view: DLD historical + Bayut fresh (≥2026-03-01)
- Includes refresh function `refresh_mv_txn_monthly_unified()`
- Run with: `npm run migrate:bayut`

**`lib/bayut14.ts`**
- `fetchBayutPage(purpose, page)` — GET /transactions?purpose=for-sale|for-rent&page=N
- `transformBayutHit(hit)` — normalises Bayut fields to DLD-compatible schema
- `bedsToRoomsEn(beds)` — maps numeric bed count → DLD rooms_en format (e.g. 2 → '2 B/R')

**`app/api/cron/fetch-bayut-transactions/route.ts`**
- Daily cron at 06:45 UTC (25 pages = 750 req/month, 150 reserve)
- Budget circuit-breaker: skips if ≥800 requests logged this month
- Upserts with ON CONFLICT DO NOTHING
- Triggers `refresh_mv_txn_monthly_unified()` after ingest

### Modified Files
**6 terminal pages** — `mv_txn_monthly` → `mv_txn_monthly_unified`:
- `app/terminal/communities/page.tsx`
- `app/terminal/communities/[slug]/page.tsx`
- `app/terminal/yield-map/page.tsx`
- `app/terminal/area-momentum/page.tsx`
- `app/terminal/rental-yield-decay/page.tsx`
- `app/terminal/transaction-pulse/page.tsx`

**`lib/api-budget.ts`** — added `BAYUT14_BUDGET` (900 req/month) + `bayutIngest` cron schedule

### Architecture
- DLD side of unified view: reads from existing `mv_txn_monthly` (no re-computation)
- Bayut side: months ≥ 2026-03-01 only → mutual-exclusive date ranges, no double-counting
- `area_name_mapping` translates Bayut taxonomy → DLD `area_name_en` for unified querying

### Next Steps
1. Run `npm run migrate:bayut` to apply schema changes
2. Add cron-job.org entry: GET `/api/cron/fetch-bayut-transactions` Bearer CRON_SECRET at 06:45 UTC daily
3. When back in Dubai: refresh DLD CSV, update Bayut cutoff date in migration to match new DLD max date
