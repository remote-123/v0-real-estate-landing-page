# North Capital DXB — Growth Automation Playbook
*Solo operator edition — everything either runs itself or routes to Telegram for 30-second human approval*
*Last updated: 2026-03-11*

---

## Context: Existing Automation Stack

```
Email (PR/PDF) → Apps Script → /api/ai-blog-generator → Gemini → Sanity (draft) → Telegram (approve to publish)
Apify (Bayut/PF) → Supabase rental_listings → /terminal/rental-drops
cron-job.org → X post pipeline (distress deals, 4x/day)
LinkedIn pipeline → 3 rotating formats → Telegram → manual publish
```

**What's missing:** All of the above are *content pipelines*, not *discovery pipelines*. They produce content but don't pull new audiences into the funnel. These 7 pipelines fix that.

---

## Pipeline Rankings (Impact vs Effort)

| # | Pipeline | Traffic Type | Effort | Impact |
|---|----------|-------------|--------|--------|
| 1 | **Programmatic SEO — Community Pages** | Organic search | Low | 🔥🔥🔥 |
| 2 | **Weekly Data Digest Newsletter** | Repeat + referral | Low | 🔥🔥🔥 |
| 3 | **Reddit/Forum Signal Monitor → Telegram** | Referral | Medium | 🔥🔥 |
| 4 | **WhatsApp/Telegram Group Distribution** | Direct/referral | Low | 🔥🔥🔥 |
| 5 | **Monthly DLD Data Report → Journalist Outreach** | Backlinks + referral | Medium | 🔥🔥 |
| 6 | **AEO FAQ Auto-Generator** | AI search / featured snippets | Low | 🔥🔥 |
| 7 | **YouTube Shorts Script Pipeline** | Search + social | Medium | 🔥 |

---

## Pipeline 1 — Programmatic SEO: Community Pages
### *"Turn your Supabase data into 50+ Google-indexable property pages"*

**The insight:** You have `rental_listings` (live Bayut/PF data) and `mock-communities` (40+ areas). Every community is a high-intent keyword:
- "Dubai Marina rental prices 2026" — 2,400 searches/mo
- "JVC rental yield" — 1,100 searches/mo
- "Business Bay average rent" — 1,800 searches/mo

**What to build:**
```
/terminal/communities/[slug]  ← already scaffolded, just needs real data
/terminal/communities/dubai-marina
/terminal/communities/jumeirah-village-circle
... (40+ pages, all pre-built from mock-communities.ts)
```

**Automation flow:**
```
Supabase (rental_listings + buildings)
  → Next.js ISR (revalidate: 86400)
  → /terminal/communities/[slug]
  → Dynamic metadata with real numbers ("Dubai Marina avg rent AED 12,400/mo")
  → JSON-LD RealEstateListing + FAQPage schema
  → Google indexes 40+ pages automatically
```

**SEO config per page:**
- Title: `"Dubai Marina Rental Prices & Yields 2026 | North Capital DXB"`
- Description: `"Live rental data: AED X avg/mo, X.X% gross yield, X transactions in 30 days."`

**Estimated traffic:** 400–900 organic visits/month within 90 days. Compounding.

**Implementation:** ~1 day (data aggregation query + page template). Runs forever after.

---

## Pipeline 2 — Weekly Data Digest Newsletter
### *"Every Monday, your data generates itself + emails your list automatically"*

**What it sends:**
```
📊 North Capital Weekly — [Date]

TOP 3 RENTAL DROPS THIS WEEK
  → [Area]: AED X,XXX/mo (was X,XXX, -8%)

YIELD LEADER
  → Dubai Sports City: 8.1% gross

NEW DISTRESS DEALS
  → 3 properties at >25% below market

MACRO SIGNAL
  → One line from terminal's Economic data

[CTA → northcapitaldxb.com/terminal]
```

**Automation flow:**
```
cron-job.org (Monday 6AM UTC)
  → /api/weekly-digest
  → Supabase: rental_listings (top drops, new listings)
  → Sanity: distress deals added this week
  → Gemini: 2–3 sentences of analysis
  → Draft sent to Telegram → you approve → email sends via Resend
  → Condensed version auto-posted to LinkedIn
```

**Email capture:** Terminal page header, blog sidebar, exit-intent popup on /terminal.

**Traffic yield:** List of 500 = 200–400 weekly visits from warm leads.

---

## Pipeline 3 — Reddit/Forum Signal Monitor → Telegram
### *"Know when someone asks about Dubai property. Answer with data."*

**Subreddits to monitor:**
- r/DubaiExpats — "rental", "apartment", "yield", "invest", "buy vs rent"
- r/dubai — "property", "real estate", "rent increase"
- r/expats — "Dubai move", "Dubai property"

**Automation flow:**
```
cron-job.org (every 4 hours)
  → /api/reddit-monitor
  → Reddit public RSS/JSON (no auth needed for reading)
  → Filter: posts < 6 hours old, keyword match, no prior reply
  → Gemini: generates data-backed 2-paragraph reply + terminal link
  → Sends post title + reply draft to Telegram
  → You paste + post manually (human post = no shadow-ban risk)
```

**Traffic yield:** 10–80 visits per quality reply. 3 replies/week = 150–300 monthly visits from active property researchers.

**Implementation:** ~1 day. No Reddit API key needed.

---

## Pipeline 4 — Telegram Channel + Group Distribution
### *"Your distress deals auto-posted to your channel. You share the channel in groups."*

**Track A — Your own channel (start this week):**
```
Create: t.me/NorthCapitalDXB
→ Extend existing distress-deals cron to also push to this channel
→ Weekly digest: rental data summary, macro signal, distress deals
→ Cross-promote in Dubai property groups
```

**Track B — Group distribution:**
```
Join Dubai property WhatsApp/Telegram groups as yourself
→ Weekly: post distress deal data summary with terminal link
→ One value-add post per week per group (not spam)
→ Build credibility → members research → some book a call
```

**Traffic yield:** 100–500 visits/month. Converts better than social because audience is already in "property research mode."

---

## Pipeline 5 — Monthly DLD Data Report → Journalist Outreach
### *"Auto-generate market stats. Email journalists. Get quoted. Get backlinks."*

**Report contents (auto-generated):**
```
NORTH CAPITAL DXB — [Month] Dubai Rental Market Report

- Average 2BR rent: AED X,XXX/mo ([±X%] vs last month)
- Top-yield community: [Area] at X.X%
- Fastest rental drop: [Area], -X% MoM
- New listings: X (from Bayut + PropertyFinder)
- Distress deal activity: X properties listed below AED 2M
```

**Automation flow:**
```
cron-job.org (1st of every month)
  → /api/monthly-report
  → Supabase: rental trends by area + bedroom type
  → Gemini: press-ready narrative (authoritative, not promotional)
  → Published as Sanity blog post (SEO asset)
  → Journalist outreach email draft sent to Telegram
  → You personalize + send to 10–15 Dubai RE journalists
```

**Journalist targets (build list once):**
- The National (UAE) — property desk
- Gulf News — real estate section
- Khaleej Times — property reporter
- Arabian Business — real estate
- Property Monitor

**Traffic yield:** 1 backlink from The National = 200+ authority visits. Monthly cadence builds relationships.

---

## Pipeline 6 — AEO FAQ Auto-Generator
### *"Get cited by ChatGPT, Perplexity, and Google AI Overviews for Dubai property questions"*

**The insight:** 30–40% of property research now starts with AI. Right now, AI engines cite Bayut and Property Monitor — not you. This pipeline changes that.

**What to build:**
```
/terminal/faq — auto-generated, monthly updated

Q: "What is the average rental yield in Dubai?"
A: "Based on live aggregation across 40 communities, the average gross yield
   is X.X% as of [Month]." (with community breakdown)

Q: "What is the cheapest area to rent in Dubai?"
A: "International City averages AED X,XXX/month for a 1BR..."

Q: "How do I find distress deals in Dubai?"
A: "North Capital DXB's distress deal terminal tracks..."
```

**Automation flow:**
```
Monthly cron:
  → Supabase: avg yield + avg rent per area, per bedroom type
  → Gemini: generates Q&A pairs (direct answers, no fluff)
  → Updates FAQPage in Sanity with fresh numbers
  → Page includes FAQPage JSON-LD schema for every entry
  → Google re-indexes → AI engines pick up as citation source
```

**Target queries:**
- "average rent in [Dubai area]"
- "rental yield Dubai [community]"
- "is Dubai real estate overpriced"
- "best areas to invest in Dubai 2026"

**Traffic yield:** Compounding. Once cited by an AI engine, you stay cited unless someone builds better pages.

---

## Pipeline 7 — YouTube Shorts Script Pipeline
### *"Your blog posts auto-become 60-second video scripts. You record once a week."*

**Automation flow:**
```
Sanity blog publish webhook
  → /api/youtube-script
  → Gemini: extracts 3 data points + generates 60-second script
    Format: Hook (5s) → Stat 1 (15s) → Stat 2 (15s) → Stat 3 (15s) → CTA (10s)
  → Sends to Telegram: script + suggested B-roll text overlays
  → You record on phone → post as YouTube Shorts + Instagram Reel
```

**Why YouTube:** Shorts rank in Google search results, providing a second organic search channel.

**Traffic yield:** Slower (3–6 months to compound) but provides a permanent second channel.

---

## Implementation Order

| Timeframe | Action |
|-----------|--------|
| **This week** | Create Telegram channel + extend distress-deals cron to push to it (2 hours) |
| **This week** | Build `/terminal/faq` with first 10 Q&As + FAQPage JSON-LD (3 hours) |
| **Next 2 weeks** | Programmatic community pages — data aggregation query + page template (1 day) |
| **Next 2 weeks** | Reddit monitor API route + Telegram delivery (1 day) |
| **Month 2** | Weekly email digest + subscribe form on terminal/blog (2 days) |
| **Month 2** | Monthly data report auto-generator (1 day) |
| **Month 3+** | YouTube Shorts script generator |

---

## Estimated Traffic Stack (Month 3)

| Pipeline | Monthly Visits |
|----------|---------------|
| Programmatic SEO (40+ community pages) | 400–900 |
| Email newsletter (click-through) | 200–400 |
| Reddit replies (referral) | 150–300 |
| Telegram/WhatsApp groups | 100–300 |
| AEO (AI citations + featured snippets) | 100–300 |
| Journalist mentions (backlink traffic) | 50–200 |
| YouTube Shorts | 50–150 |
| **Total new automated traffic** | **~1,050–2,550/month** |

---

## The Meta-Principle

> Every pipeline should: **run itself → route to Telegram for 30-second approval → publish.**
> You're the editor, not the writer. The machines write, you curate.
