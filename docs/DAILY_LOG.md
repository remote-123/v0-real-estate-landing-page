# Daily Log: North Capital DXB

> [!IMPORTANT]
> **Log Rules for AI Assistants:**
> 1. Use `## DD Month YYYY` for date headers.
> 2. Limit to 1-2 concise bullet points per specific topic.
> 3. **Mandatory Signature:** Every entry must explicitly state the tool name at the start (e.g., *"Built by Antigravity"*, *"Built by Claude Code"*, or *"Built by Cursor"*).


## 05 April 2026
*Built by Claude Code*
- **Better Auth Migration**: Replaced `next-auth` v5 with `better-auth` v1. Auth flow: Google OAuth via `socialProviders`, Neon postgres adapter (`pg` Pool). Created Better Auth tables (`user`, `session`, `account`, `verification`) via migration script. API handler moved from `/api/auth/[...nextauth]` → `/api/auth/[...all]`. All server components continue using `await auth()` via compat wrapper. Client components now use `authClient` from `lib/auth-client.ts`.
- **Admin Dashboard User Panel**: Updated users query to join Better Auth `user` + `account` tables (replaces old NextAuth `users` table). Provider breakdown now reads `account.provider_id`. Active-7d count derived from `session.updated_at`.

## 21 March 2026
*Built by Antigravity*
- **Communities Table Innovation**: Removed the static 'Yield' column and replaced it with an engaging, interactive 'Trend (1Y)' SVG sparkline. Sorts flawlessly and provides a 12-month mathematical price-per-sqft history to fuel High-Net-Worth investor clicks.
- **Codebase Data Cleanup**: Finalized the deletion of `lib/mock-communities.ts` and fake data, migrating the strict `Community` TypeScript interface into `lib/types/community.ts` to confirm 100% of the platform's intel is pulled strictly from live DB requests.
- **Specialized Architect Agents**: Analyzed the popular `agency-agents` open-source repository and cherry-picked 6 advanced agents (Xiaohongshu Specialist, Carousel Growth, A11y Auditor, Meta CAPI Tracking, UX Researcher, WeChat Private Domain). Extensively re-engineered their baseline prompts to remove all "fluff" and adhere specifically to the North Capital DXB institutional-grade persona.
## 16 March 2026
*Built by Claude Code*
- **Communities Table — Runtime Fixes**: Fixed `value.toFixed is not a function` crash in `MomBadge` — postgres.js returns SQL `numeric` as strings, fixed by coercing with `Number(value)`. Added `suppressHydrationWarning` to `<body>` in `app/layout.tsx` to silence Grammarly extension hydration mismatch.
- **Community Chart — Visibility Fix**: `hsl(var(--accent))` doesn't resolve inside SVG presentation attributes (Recharts renders SVG, not CSS). Replaced with hardcoded `#10b981` (emerald-500). Converted `LineChart` → `AreaChart` with gradient fill (25%→0% opacity) for better visual presence.
- **Communities [slug] — 404 Fix**: `generateStaticParams` only knew ~15 mock slugs; all 80 real DLD areas 404'd. Rewrote `[slug]/page.tsx` to `force-dynamic` — resolves slug by querying all distinct `area_name_en` from `mv_txn_monthly` and matching by `toSlug()`. Removed all `MOCK_COMMUNITIES` dependency. Now shows real KPIs + 12-month price history per area from live DB.
- **InfoTip on MoM / DOM Headers**: Added `<InfoTip>` component (native `title` tooltip + `Info` icon) to MoM Δ and DOM column headers in `communities-table.tsx` explaining each metric for new investors.

## 15 March 2026
*Built by Claude Code*
- **Communities — Real Data**: Replaced 100% mock data with live DLD query from `mv_txn_monthly` + `dld_projects`. Top 80 areas by Feb 2026 transaction volume. Real columns: AED/sqft (converted from AED/sqm), avg sale price, txn count, MoM PSF change, pipeline units. Yield/DOM show "—" (not available from DLD). `export const dynamic` fix resolved build timeout.
- **Market Intelligence Seeded**: Created and published 6 `terminalCategory` documents in Sanity (Economic Foundations, Real Estate Market, Demographics, Infrastructure, Tourism, Regulatory) with 4 metrics each and full historical data series. Page was blank due to empty CMS.
- **Distress Deals V2**: Replaced synthetic `originalPrice` with real distress signals — PSF vs DLD area benchmark (18-month avg from `dld_transactions`), DOM tier scoring (FRESH/AGING/STALE/OVERDUE), offplan cut detection. Composite 0–100 distress score with signal tags (`BELOW_MARKET`, `HIGH_DOM`, `OFFPLAN_CUT`).
- **Area Filter + Intelligence**: Added community filter dropdown to `DistressFilters` (populated from live listing data). Area Intelligence panel shows top 6 communities by deal count with avg DOM and top distress score.

## 11 March 2026
*Built by Antigravity*
- **Supabase MCP**: Authorized official MCP for direct DB access and automated SQL execution.
- **Reddit Voice Extraction**: Scraped 11 years of u/hassie1 history (~589 samples) into Supabase for voice-style training.
- **Reddit Monitor Expansion**: Scaled to 13+ HNW and real estate subreddits with shuffled targeting and strict "must-contain" filters for global threads.
- **Telegram Topics**: Refactored `sendTelegram` to support Supergroup Topics, routing Reddit alerts to a dedicated thread.
- **Dev Environment**: Cleared Next.js lock file issues and established stable local server routing.

## 12 March 2026
*Built by Antigravity*
- **Telegram Routing Fix**: Identified and resolved an issue where automated posts were defaulting to personal chat instead of group topics. Refactored LinkedIn, Distress Deals, and X-Post pipelines to explicitly pass `message_thread_id`.
- **Environment Cleanup**: Consolidated topic IDs in `.env.local` (Reddit: 3, X-Post: 4, LinkedIn: 8, Distress: 4) and removed interfering inline comments.
- **Improved Logging**: Enhanced Telegram utility to log API status codes and response bodies for better debugging of delivery failures.

## 15 March 2026
*Built by Claude Code*
- **Neon Migration**: Migrated database from Supabase (500MB free limit hit) to Neon Launch ($19/mo, 10GB). All schemas applied, lookup tables re-ingested. Large table ingestion (transactions, units) running in background.
- **postgres.js**: Replaced `@supabase/supabase-js` DB queries with `postgres.js` across all terminal pages and ingest scripts. New `lib/db.ts` (pooled) and `scripts/ingest/neon-client.ts` (direct) handle connections. Supabase free project retained for Auth only.
- **dld_projects ingest**: Created missing `scripts/ingest/dld_projects.ts`. Fixed status values (`ACTIVE`, `NOT_STARTED`, `PENDING` vs old title-case values). 3,039 projects ingested.
- **Loading UI**: Added `app/terminal/loading.tsx` — NC logo pulse + bouncing dots while server components fetch data.

## 14 March 2026
*Built by Claude Code*
- **Telegram Error Alerts**: Standardized error routing across `ai-blog-generator`, `ai-project-generator`, `ai-linkedin-post-generator`, and `ai-x-post-generator`. All critical pipeline failures are now surfaced in the dedicated **Errors** topic (ID 36).
- **Topic Accuracy**: Updated `TELEGRAM_THREAD_ID_DISTRESS` to **34** per user observation of live Telegram routing.
- **Dev Environment**: Resolved Next.js lock file collision (`.next/dev/lock`) and terminated stale processes to restore local `npm run dev` stability.
- **DLD Data Ingestion**: (Existing notes preserved) Moved all CSVs to `dld_data/`...
- **Terminal Roadmap**: Saved `docs/TERMINAL_ROADMAP.md` — 8-page PO roadmap across 3 phases. Key finding: Community Screener is 100% mock data. Phase 1 unblocked immediately (Price Index, Supply Pipeline, Service Charges). Phase 2 requires `mv_txn_monthly` materialised view before building.
- **Phase 1 Terminal Pages Built**: `/terminal/price-index` (Recharts line chart, 3 lines, YoY stat cards, date range picker), `/terminal/supply-pipeline` (sortable table + status badges + horizon filters), `/terminal/service-charges` (aggregated table, community/year filters, sort). All 3 added to sidebar nav. Pre-existing build errors in unrelated files; new pages are clean.

## 15 March 2026
*Built by USER*
- **Postgres.js Migration**: Migrated 9 ingestion scripts in `scripts/ingest/` to use `postgres.js` (Neon) instead of `Supabase-js` for better analytical handling and standard SQL conflict resolution.
- **Database Alternatives**: Audited 10 Postgres providers for high-volume DLD data (4M+ rows). Recommended Neon or PlanetScale ($12/mo range) as cost-effective alternatives to Supabase Pro.
