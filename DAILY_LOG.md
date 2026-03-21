# Daily Log

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
