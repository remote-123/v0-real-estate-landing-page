# North Capital DXB — CTO Technical Roadmap (Infrastructure)
*Goal: Highly resilient, agentic data pipeline for 1,000+ data points daily*

---

## 🏗️ Core Infrastructure: The Agentic Middle Layer
North Capital isn't just a website; it's a data engine + content factory.
Our technical mission is: **Low-friction, high-accuracy automation with a "Human-in-the-Loop" (HITL) approval gate.**

---

## 🛠 Active Technical Pipelines (Live)
- [x] **Supabase Database Layer** — `rental_listings`, `buildings`, `reddit_seen_posts`.
- [x] **Multimodal AI Pipeline** — Apps Script → Gemini (3 Flash) → Sanity.
- [x] **Telegram Integration** — Notification library for approval/trigger flows.
- [x] **Apify Web Scrapers** — Daily extraction from PropertyFinder (PF) and Bayut.

---

## 🛠️ NEW: In-Progress & Technical Backlog

### 1. Reddit Voice Training & Monitor (High Priority)
*Objective: Scale high-quality, non-slop human-touch replies.*
- [ ] **Voice Extraction**: Populate `reddit_voice_samples` via `scripts/extract-reddit-voice.ts`.
- [ ] **Inference**: Wire `app/api/reddit-monitor/` to use voice-samples in the prompt.
- [ ] **HITL**: Build `/api/reddit-monitor/approve` (Telegram webhook) to mark as "Posted".

### 2. Community Intelligence Engine: From Mock to Live
*Objective: Real-time aggregation of transactional data.*
- [ ] **Aggregation Query**: View/Function to compute avg price per sqft + yield from `rental_listings`.
- [ ] **ISR Strategy**: Next.js Incremental Static Regeneration for 40+ community pages.
- [ ] **DLD Integration**: Deep-dive into building certificates for "Supply Pipeline" accuracy.

### 3. Supabase MCP Server Implementation
*Objective: Drop copy-paste dev overhead.*
- [ ] **MCP Setup**: Authenticate/Authorize at `https://mcp.supabase.com/mcp`.
- [ ] **Utilization**: Direct DB manipulation from this chat without manual SQL pastes.

### 4. Data Hygiene & Indexing
*Objective: Protect the engine from bad data.*
- [ ] **Cleaner**: Delete/Archive rental listings >90 days old to keep Supabase snappy.
- [ ] **Duplicate Detection**: Advanced logic for same-property listings across PF and Bayut.

---

## 🛠️ Stack Check (Q1 2026)
- **Framework**: Next.js 16 (Turbopack).
- **AI**: Gemini 2.5 Flash / 1.5 Flash.
- **DB**: Supabase (PostgreSQL) + Sanity (CMS).
- **Automation**: cron-job.org + Apps Script.

---

## 📝 Performance & SEO Audit
- [ ] **Lighthouse**: Target 95+ Score across all `/terminal` interactive pages.
- [ ] **Structured Data**: JSON-LD for `RealEstateListing` on every community page.
- [ ] **Image Optimization**: Ensure `@sanity/image-url` builder is used for responsive assets.
