# North Capital DXB — To-Do Capture List

## Backlog -- add any items to review (big or small), each item is just a prompt that will need SKILLS refinement



- [x] Create Strategic READMEs for every C-Suite: [CEO-GROWTH.md](file:///Users/hl/Documents/GitHub/v0-real-estate-landing-page/CEO-GROWTH.md), [CMO-MARKETING.md](file:///Users/hl/Documents/GitHub/v0-real-estate-landing-page/CMO-MARKETING.md), [CTO-TECHNICAL.md](file:///Users/hl/Documents/GitHub/v0-real-estate-landing-page/CTO-TECHNICAL.md), [COO-OPERATIONS.md](file:///Users/hl/Documents/GitHub/v0-real-estate-landing-page/COO-OPERATIONS.md), [CRO-SALES.md](file:///Users/hl/Documents/GitHub/v0-real-estate-landing-page/CRO-SALES.md). focus on new strategies to get more visits.

- [x] DFM Real Estate Index integration in terminal page - goal is for the user to see liquid market as a leading indicator for what's to come for real estate market in dubai
- [x] Supabase MCP Database authenticated and configured locally with custom STDIO runner
- [ ] Fine-tune Reddit to be useful for operations (Context awareness, Thread scraping, Lead classification)




---

## In Progress

- [ ] Community Screener — complete data layer before making visible to users

---

## Site & Product

- [ ]
- [ ]

---

## Content & Copy

- [ ]
- [ ]

---

## Tech & Pipelines


- [x] Reddit Monitor Pipeline — voice-trained AI reply drafts sent to Telegram every 4hrs. Monitors r/DubaiExpats, r/dubai, r/expats for property questions. Fetches user's own Reddit comment history → trains Gemini on writing style → generates non-slop replies with real Supabase data → routes to Telegram for 30s copy-paste approval. See: /app/api/reddit-monitor/
- [ ]

---

## Marketing & Growth

- [ ]
- [ ]

---

## Done

- [x] RERA Broker #95133 added to hero, trust signals, about page, footer
- [x] Founder section rewritten with fintech background narrative
- [x] Homepage section order restructured (Founder moved up, KnowledgeHub moved down)
- [x] Distress deal cards — full card clickable to calendar link
- [x] Golden Visa Wizard — email now correctly POSTing to Google Sheets (was broken)
- [x] Community Screener hidden from sidebar until ready
- [x] Mobile sticky bar hidden on /studio page
- [x] Telegram X post pipeline — 3 PF + 3 Bayut deals per run
- [x] Blog-to-XPost pipeline — bypasses Sanity, sends directly to Telegram
- [x] cron-job.org configured for automatic 4-hourly X posting
- [x] LinkedIn post generator pipeline — 3 rotating formats, sends draft to Telegram
- [x] LinkedIn company page description written
- [x] Blog sidebar form — instant checkmark, no calendar, "within 24 hours" message
- [x] Blog sidebar form — "How did you hear about us?" field added
- [x] Blog index — compact list cards for all posts below the feature
- [x] Blog generator prompt — anti-AI-slop rules, banned phrases, forced specificity
