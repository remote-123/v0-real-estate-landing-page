# Daily Log

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
