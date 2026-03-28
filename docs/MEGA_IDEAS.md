# Mega Ideas — North Capital DXB Terminal
## Open Source Tools + Differentiation Strategy
### Last updated: 2026-03-26

---

## Strategic Goal
**Traffic → Terminal → Upsell or VC pitch.**
The terminal needs to become the default research tool for Dubai investors. That means:
1. Organic traffic via unique data views no competitor has
2. Sticky tools that bring users back weekly
3. A lead funnel (email capture → personalised digest → consult)
4. A data moat story for investors: "We have 1.66M transactions, live distress data, and X,000 registered users"

---

## Part 1: Technical Tools (Build Into Terminal)

## 1. Pascal Editor — 3D Floor Plan & Building Visualiser
**Repo**: https://github.com/pascalorg/editor
**Stack**: React 19, Next.js, Three.js, WebGPU, Zustand
**Status**: Open source, actively developed

### What it is
A browser-native 3D architectural editor. Users can draw walls, place rooms, view in 3D, and export floor plans — all in the browser with no install.

### Use cases for our terminal

| Use Case | Where it fits |
|---|---|
| **Unit layout viewer** | On building comparator — show actual floor plan layouts for a selected unit type alongside the PSF chart |
| **Off-plan project explorer** | On `/terminal/off-plan-pipeline` — let users browse a project's tower layout in 3D, click a floor to see available units |
| **Portfolio map** | For leads who shortlist multiple units — render a side-by-side 3D comparison of two units in different buildings |
| **Investor presentation mode** | Embed a floor plan + yield overlay so investors can share a visual brief with clients |

### Why it's differentiating
Every proptech shows static PDFs for floor plans. An interactive, browser-native 3D layout viewer — linked directly to live DLD transaction data — would be unprecedented in the Dubai market.

---

## 2. deck.gl — High-Performance Property Heatmaps
**Repo**: https://github.com/visgl/deck.gl
**Stack**: WebGL2/WebGPU, pure JS, works with React
**Status**: Production-grade, used by Airbnb/Uber internally

### What it is
A WebGL rendering engine for large geospatial datasets. Can render 100,000+ data points on a map with smooth interaction — price heatmaps, deal clusters, supply pipelines overlaid on a base map.

### Use cases for our terminal

| Use Case | Where it fits |
|---|---|
| **Transaction heatmap** | Replace the text-heavy area-momentum table with a live DLD transaction density map of Dubai |
| **Price gradient map** | Colour-code areas by avg PSF — users instantly see where value concentrates |
| **Distress deal map** | Plot distress listings as dots on a map — size = discount %, colour = tier |
| **Supply pipeline overlay** | Show off-plan project launch locations + delivery years as a layered map |

### Why it's differentiating
Dubai real estate data is currently consumed as tables and bar charts. A map-first experience where you can visually navigate price by area — with DLD data underneath — is a genuine edge.

---

## 3. Kepler.gl — Drag-and-Drop Spatial Analysis
**Repo**: https://github.com/keplergl/kepler.gl
**Stack**: React, Redux, MapLibre GL, deck.gl
**Status**: Open source, Uber-maintained

### What it is
A full geospatial analysis UI — importable as a React component. Users can upload CSVs, apply filters, and explore spatial patterns without writing code.

### Use cases for our terminal

| Use Case | Where it fits |
|---|---|
| **Analyst sandbox** | Power users (agents, funds) upload their own CSV of target units and overlay against our DLD data |
| **Area deep-dive** | Embedded kepler view on `/terminal/areas/[slug]` — transactions plotted on a neighbourhood map |
| **Rental yield explorer** | Spatial view of yield % by sub-community — identify micro-pockets of high yield within an area |
| **Metro proximity filter** | Filter all listings/transactions by walking distance to specific metro stations |

---

## 4. Observable Plot — Declarative Data Charts
**Repo**: https://github.com/observablehq/plot
**Stack**: Pure JS, D3 under the hood, zero dependencies
**Status**: Production-grade, MIT licensed

### What it is
A grammar-of-graphics charting library — more expressive than Recharts, better for analytical dashboards. Supports faceted views, dot plots, hexbins, regression lines out of the box.

### Use cases for our terminal

| Use Case | Where it fits |
|---|---|
| **PSF scatter plots** | Replace the bar chart on floor-plan-pricer with a dot plot showing every individual transaction — P10/P90 becomes visual |
| **Yield regression lines** | On rental-yield-decay — add a trend line + confidence band instead of raw quarterly bars |
| **Comparative density** | On building comparator — show both buildings as overlapping distribution curves, not just averages |
| **Momentum sparklines** | Tiny inline sparklines in the area-momentum table for instant visual context |

---

## 5. TanStack Table (React Table v8) — Power Data Tables
**Repo**: https://github.com/TanStack/table
**Stack**: Headless React, TypeScript-first
**Status**: Industry standard, v8 production-stable

### What it is
A headless table engine — full sorting, filtering, pagination, column visibility, row selection, virtualisation for large datasets. Zero CSS — you own the UI.

### Use cases for our terminal

| Use Case | Where it fits |
|---|---|
| **Transactions explorer** | A raw deal browser — let users sort/filter all 1.66M DLD transactions by area, building, price, date |
| **Communities table** | Replace the current static community list with a fully interactive sortable/filterable table |
| **Building comparator rows** | Replace the custom rental comparison table with a proper virtualised grid |
| **Distress deals list** | A filterable, sortable distress deals browser — filter by area, bed type, discount %, days on market |

---

## 6. Transformers.js — Browser-Side AI (Zero API Cost)
**Repo**: https://github.com/xenova/transformers.js
**Stack**: Pure JS, WASM, runs entirely in browser
**Status**: Production-ready, HuggingFace maintained

### What it is
Runs HuggingFace ML models directly in the browser — no server, no API calls, no cost. Sentiment analysis, embeddings, classification, text generation all run client-side.

### Use cases for our terminal

| Use Case | Where it fits |
|---|---|
| **Listing sentiment scorer** | Score the title/description of each distress listing — "motivated seller" vs generic listing — without an API call |
| **Area similarity search** | Embed area descriptions and find "areas similar to JVC" by vector proximity |
| **Natural language deal search** | Let users type "3-bed under 1.5M with metro access" — parse intent without GPT API cost |
| **Auto-categorise listings** | Classify distress listings by reason (renovation, divorce, relocation) from title text |

---

## 7. Apache ECharts — Advanced Chart Types
**Repo**: https://github.com/apache/echarts
**Stack**: Pure JS, Canvas/SVG, React wrapper available
**Status**: Apache top-level project, widely used

### What it is
A chart library with types Recharts doesn't have: candlestick (OHLC), treemaps, sunburst diagrams, Sankey flows, liquid fill, calendar heatmaps with more granular control.

### Use cases for our terminal

| Use Case | Where it fits |
|---|---|
| **PSF candlestick chart** | Show quarterly price as OHLC (open=P25, close=P75, wick=P10/P90) — reads like a financial chart, familiar to investors |
| **Developer market share treemap** | Visualise developer transaction volume as a proportional treemap |
| **Sankey flow** | Show how transaction volume flows: Sales → Area → Building type |
| **Calendar heatmap** | Replace the custom transaction heatmap with ECharts' built-in calendar view — more options, better mobile |

---

## Big Differentiating Ideas (Beyond Tools)

### A. "Deal Radar" — Real-Time Disappearance Velocity
Track how fast listings disappear from PropertyFinder per area. If JVC has 40% of its distress listings disappear within 7 days, that's a "hot zone" signal no other platform shows.

**Data we already have**: `distress_listings.disappeared_at` + `first_seen_at`
**Output**: A ranked table of areas by absorption speed — the faster listings vanish, the hotter the market

---

### B. "Investor Passport" — Personalised Deal Feed
After email capture, build a preference profile (area, budget, bed type, yield target). Generate a weekly personalised shortlist from our distress snapshot — not a generic newsletter, a scored list matched to their criteria.

**Data we already have**: `email_leads`, `distress_listings`, DLD yield data
**Output**: Personalised digest email + a `/my-deals` page gated by email token

---

### C. "Building DNA" — Full Historical Profile Page
One page per building (linked from comparator) showing: PSF trend since 2015, service charge history, rental yield by bed type, distress listing frequency, off-plan vs resale split, nearest metro, developer track record.

**Data we already have**: All of this across DLD tables + distress_listings + rental_listings
**Output**: `/terminal/buildings/[slug]` — linkable, shareable, the most comprehensive building page in Dubai

---

### D. "Price Memory" — What Did This Unit Sell For Before?
When a distress listing appears, show what the same unit (or nearest comparable) sold for 1, 2, 3 years ago. The "price memory" creates an immediate anchor — "this unit sold for 1.8M in 2022, asking 1.4M now."

**Data we already have**: `dld_transactions` + `distress_listings` with `canonical_key`
**Output**: A "Price Memory" card on the distress deals page for each listing

---

### E. "Metro Value Gradient" — Walk-Time to Station vs PSF
Map every DLD building's distance to its nearest metro station vs avg PSF. Show the correlation curve: at what walk-time does price drop significantly? Find the "value corridor" — buildings close enough to metro to command premium but priced as if they're far.

**Data we already have**: `nearest_metro_en` in DLD transactions, building lat/longs in `dld_buildings_registry`
**Output**: A scatter plot page — the most useful location-value tool for Dubai investors

---

---

## Part 2: AI Tools (Drive Traffic + Stickiness)

## 8. Vercel AI SDK — Embedded "Dubai Investment Advisor"
**Repo**: https://github.com/vercel/ai
**Stack**: TypeScript, works with Next.js natively, provider-agnostic (Gemini/Claude/OpenAI)
**Status**: Production-grade, maintained by Vercel

### What it is
A unified AI SDK for streaming chat, structured outputs, and tool-calling agents — designed specifically for Next.js. We already use Gemini and the architecture is compatible.

### Use cases for our terminal

| Use Case | Traffic / Growth impact |
|---|---|
| **"Ask the data" chat** | User types "Which area had the highest PSF growth last year?" — AI queries our DLD data and answers in plain English. Makes the terminal feel like Bloomberg Terminal with a chat layer. |
| **Investment brief generator** | User selects a building → AI generates a 1-page investment summary (yield, PSF trend, distress activity, comparable sales). Downloadable PDF. Shareable link. **Massive organic share potential.** |
| **Natural language alert setup** | "Notify me when a 2-bed in JVC drops below 900K" — AI parses intent, stores as a query against distress_listings, emails when triggered |
| **On-page assistant** | Floating chat on every terminal page — contextually aware of what data is shown. Explains charts, answers follow-up questions, no new tab needed. |

### Why it matters for VC pitch
"We have an AI layer trained on 1.66M Dubai transactions that answers investor questions in real time" — that's a fundable story. It also generates data on what investors are actually asking, which is its own asset.

---

## 9. n8n — Marketing Automation Without Code
**Repo**: https://github.com/n8n-io/n8n
**Stack**: Node.js, self-hostable, 400+ integrations
**Status**: Production-grade, $1.2B valuation, open source core

### What it is
A visual workflow automation tool — like Zapier but self-hosted, far more powerful, and free at our scale. Connects any API to any API with conditional logic, loops, and AI steps built in.

### Use cases for marketing

| Use Case | Impact |
|---|---|
| **Lead scoring pipeline** | When a new email lead signs up → enrich with LinkedIn/Clearbit → score by company size/job title → route high-value leads to WhatsApp immediately |
| **Content → distribution loop** | When a new blog post publishes in Sanity → auto-post to X, LinkedIn, send to email list segment, notify Telegram. One trigger, five channels. |
| **Reddit → insight → post** | When our Reddit monitor finds a relevant Dubai property question → summarise with AI → draft a reply with terminal link → queue for manual approval |
| **Weekly data digest** | Auto-pull this week's distress stats → format as a visual summary → post to Instagram Stories + LinkedIn carousel every Monday |
| **Re-engagement sequence** | Lead hasn't visited in 14 days → trigger a "here's what changed this week" email with their saved area's latest data |

### Why it matters for traffic
Every content channel is manual today. n8n turns one piece of work into 5+ distribution touchpoints automatically. Same effort, 5x reach.

---

## 10. Plausible Analytics — Privacy-First, Embeddable Dashboards
**Repo**: https://github.com/plausible/analytics
**Stack**: Elixir, self-hostable, GDPR-compliant by default
**Status**: ~20k GitHub stars, profitable bootstrapped company

### What it is
Lightweight, cookie-free analytics — GDPR compliant with no consent banner needed. Also has a public dashboard feature: you can share a live, real-time view of your site traffic publicly.

### Use cases

| Use Case | Impact |
|---|---|
| **Public traffic dashboard** | Share a live "X visitors this month" counter publicly on the site. Social proof + transparency. "Our terminal gets 12,000 monthly active researchers." |
| **VC data room** | In fundraising, show a real-time Plausible dashboard in your data room — live, unfiltered, credible. No "trust us" on user metrics. |
| **Terminal page analytics** | Which terminal pages get the most repeat visits? Which charts do users spend most time on? Shapes product roadmap with real data. |
| **Replace GA** | No cookie banner needed — cleaner UX, better for conversions (no consent wall blocking first-time visitors) |

---

## 11. Documenso — Investor Documents + NDA Signing
**Repo**: https://github.com/documenso/documenso
**Stack**: TypeScript, Next.js, Prisma — same stack as us
**Status**: Open source DocuSign alternative, ~9k stars

### What it is
Self-hosted digital document signing. Fully open source, same tech stack as this project.

### Use cases

| Use Case | Impact |
|---|---|
| **NDA before sharing deal flow** | Gate the high-value distress deals list behind a quick NDA sign — instantly qualifies serious investors from browsers |
| **Off-plan reservation forms** | Clients who want to reserve a unit complete a digital form through our site — we become part of the transaction flow |
| **Mandate letters** | When a lead converts to a client, send the buyer mandate digitally from the platform. No DocuSign cost, full audit trail. |
| **VC data room NDAs** | Investors sign NDA before accessing full terminal data export — creates a qualified investor list as a side effect |

---

## Part 3: Growth & Marketing Ideas (No Code Required)

### M1. "Dubai Deal Pulse" — Weekly Data Embed
Create a shareable weekly snapshot widget (an `<iframe>` or Open Graph image) showing: distress deals this week, areas with highest disappearance rate, avg PSF change.

**Goal**: Property blogs, agents, and Reddit users embed it. Every embed is a backlink + brand impression.
**Effort**: 1 API endpoint + a styled `/api/pulse-card` that generates an OG image via Satori.

---

### M2. "Terminal Report" — Auto-Generated PDF for Investors
User selects: area + bedroom type + budget. System generates a branded 3-page PDF: market overview, comparable transactions, distress opportunities, yield estimate.

**Goal**: The most-shared piece of content in Dubai real estate. Agents send it to clients. Investors share it in WhatsApp groups. Every PDF has a footer: "Generated by northcapitaldxb.com/terminal."
**Effort**: Vercel AI SDK + react-pdf. No external API needed — all data is in our DB.

---

### M3. Reddit / LinkedIn Comment Intelligence
Monitor r/dubai, r/UAEinvesting, Dubai LinkedIn groups for investment questions. Draft short, helpful replies that link back to the relevant terminal page.

**Why it works**: "JVC vs JVT for investment?" → reply with a link to our area comparison. High-intent traffic from people already in research mode.
**Data**: Our Reddit monitor already scrapes — this is just adding a reply-drafting step.

---

### M4. "Live Deal Counter" on Homepage
A real-time counter: "**X distress listings tracked today** across Dubai — **Y disappeared in the last 24 hours**"

**Why it works**: Dynamic numbers create urgency and credibility. FOMO. Investors see that deals are moving fast and want to be in the pipeline.
**Effort**: One API call to `distress_listings` count + `disappeared_at` in last 24h. Already have this data from admin dashboard.

---

### M5. "The Dubai Investment Stack" — Free Resource Page
A curated page listing every tool, dataset, and resource a Dubai investor needs (DLD portal, RERA, free CSV data, mortgage calculators, etc.) — with our terminal prominently featured.

**Goal**: Ranks on Google for "Dubai real estate tools" and "Dubai investment research." Builds backlinks as other sites reference it.
**Effort**: Static page, no DB needed. High SEO value.

---

## Consolidated Priority Order

| Priority | Idea | Type | Effort | Goal served |
|---|---|---|---|---|
| 1 | TanStack Table — transactions explorer | Technical | Low | Stickiness |
| 2 | Deal Radar — disappearance velocity | Technical | Low | Traffic |
| 3 | Live Deal Counter on homepage | Marketing | Very Low | Conversion |
| 4 | Building DNA page | Technical | Medium | SEO + stickiness |
| 5 | Terminal Report PDF generator | AI + Marketing | Medium | Virality + leads |
| 6 | Price Memory card | Technical | Low | Stickiness |
| 7 | n8n content distribution loop | Marketing | Low | Traffic |
| 8 | "Ask the data" AI chat (Vercel AI SDK) | AI | Medium | Differentiation |
| 9 | Investor Passport — personalised feed | Technical | Medium | Retention |
| 10 | deck.gl heatmap | Technical | Medium | Traffic + press |
| 11 | Reddit comment intelligence | Marketing | Low | Traffic |
| 12 | Plausible public dashboard | Marketing | Very Low | VC credibility |
| 13 | Documenso — NDA gating | Tool | Medium | Lead quality |
| 14 | Dubai Deal Pulse embed widget | Marketing | Medium | Backlinks |
| 15 | Metro Value Gradient | Technical | Medium | SEO |
| 16 | Pascal Editor floor plan viewer | Technical | High | Differentiation |
| 17 | Transformers.js NL search | AI | High | Differentiation |
