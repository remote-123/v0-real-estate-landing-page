# North Capital DXB — CMO Strategic Roadmap (Marketing)
*Goal: 2,500+ monthly visits via automated discovery pipelines*

---

## 📈 Marketing Strategy: The Authority Flywheel
North Capital isn't a "volume" brand. We don't need 1M visitors; we need 2,500 high-intent HNW expats who are already researching Dubai as a hedge or yield play. Our marketing model is **Content-Led Authority**.

### The Flywheel:
1.  **Data Ingestion** (Supabase/Apify) → 
2.  **AI Analysis** (Gemini/Sanity) → 
3.  **Discovery Pipelines** (SEO/Reddit/Social) → 
4.  **Authority Terminal** (Convert to call)

---

## 🛠 Active Marketing Pipelines (Live)
- [x] **X (Twitter) Deal Feed** — 4x/day automated distress deals from PropertyFinder/Bayut.
- [x] **LinkedIn Content Engine** — Mon/Wed/Fri rotating formats (Institutional, Analytical, Case Study).
- [x] **Blog Ecosystem** — Strategic project analysis (Project X vs. Market Y) via Apps Script/Gemini.
- [x] **Distress Deal Terminal** — Live searchable database of undervalued inventory.

---

## 🚀 NEW: Discovery Pipelines (To-Do)

### 1. Reddit Monitor & Voice-Trained Replier (High Priority)
*Objective: Passive referral traffic from high-intent forums (r/DubaiExpats, r/dubai).*
- [ ] **Voice Training**: Run `scripts/extract-reddit-voice.ts` once credentials are in `.env.local`.
- [ ] **Deployment**: Set up cron to trigger `/api/reddit-monitor` every 4hrs.
- [ ] **Approval Flow**: Drafts pushed to Telegram → Human manual post (prevents shadowbans).

### 2. Programmatic SEO: Community Intelligence Pages
*Objective: Own search results for "Community name + rental yield/price per sqft".*
- [ ] **Template**: Build `/terminal/communities/[slug]` as a high-conversion data page.
- [ ] **Data layer**: Connect `rental_listings` aggregation to the frontend (replace MOCK_COMMUNITIES).
- [ ] **Indexing**: Auto-generate sitemap for 40+ communities.

### 3. AEO (Answer Engine Optimization) FAQ Engine
*Objective: Be the cited source for Perplexity & ChatGPT queries.*
- [ ] **FAQ Schema**: Build `/terminal/faq` with dynamic Q&A pairs pulled from live DB stats.
- [ ] **Structured Data**: Inject `FAQPage` JSON-LD for "What is the average yield in [Area]?"

### 4. Journalist "Data Signal" Outreach
*Objective: High-authority backlinks and PR mentions.*
- [ ] **Monthly Report**: Auto-generate a "Dubai Rental Market Pulse" PDF/Blog on the 1st of every month.
- [ ] **Distribution**: Push a press-ready summary to a curated list of UAE property journalists.

---

## 📊 North Capital Marketing Scorecard (Target: 90 Days)
| Metric | Current | Target |
|--------|---------|--------|
| **Monthly Organic Visits** | ~150 | 1,500 |
| **Referral Traffic (Reddit/Groups)** | ~20 | 500 |
| **Email List Size** | 0 | 500 |
| **Lead Form Conversion Rate**| — | > 2% |

---

## 🏷️ Brand Persona Check (The "No-Slop" Rule)
- Tone: Senior Strategist (Analytical, Contrarian, Objective).
- Banned Phrases: *stunning, luxury, unparalleled, game-changer, delve.*
- Rule: Translating developer "fluff" into institutional metrics.
