# North Capital DXB — COO Strategic Roadmap (Operations)
*Goal: 95% automated throughput with <30 mins daily founder "Approval" time*

---

## ⚙️ Operations Strategy: The Human-in-the-Loop (HITL) Model
As a solo operator, North Capital scales by delegating the **high-volume** work (data, drafting, summarizing) to machines, while the founder owns the **high-trust** work (publishing, strategy calls, relationship building).

### The Ops Cadence (Current):
1.  **Machines**: Scraping, drafting blog posts, generating X/LinkedIn posts.
2.  **Founder**: Reviewing Telegram notifications, hitting "Approve", and taking calls.

---

## 🛠 Active Operational Workflows (Live)
- [x] **Telegram Approval Bot** — Bridge for Sanity & X post drafting.
- [x] **cron-job.org Pipeline** — Daily automated triggers for data & social.
- [x] **Sanity Draft System** — Central staging for all edited/reviewed content.
- [x] **Resale PDF Import** — Multimodal ingestion from Apps Script → Gemini.

---

## ⚙️ NEW: Operational Backlog

### 1. The WhatsApp Community Funnel (High Priority)
*Objective: Build an owned audience that isn't dependent on social algorithms.*
- [ ] **Lead Capture**: Connect "Join Community" CTA on terminal/landing to a WhatsApp join link.
- [ ] **Nurture Cadence**: Structured 2x/week broadcast (e.g., Weekly Data Digest + Featured Deal).
- [ ] **CRM Bridge**: Use a simple Zapier/n8n/Make to add WhatsApp leads back to the main list.

### 2. Strategy Call Optimization
*Objective: Increase conversion from "Reader" to "Strategy Session".*
- [ ] **Calendar Integration**: Ensure the "Strategy Session" calendar is present on all project pages.
- [ ] **Follow-up Protocol**: Automated "within 24 hours" email confirmation from Google Sheets.

### 3. Pipeline Health Audit
*Objective: Ensure 100% data reliability.*
- [ ] **Error Alerts**: Telegram notifications for 500s from Gemini APIs or RapidAPI limits.
- [ ] **Sanity Cleanup**: Archiving sold/delisted distress deals from the terminal.

---

## ⚙️ Efficiency Metrics (Target: Q2 2026)
| Process | Current | Target |
|---------|---------|--------|
| **Blog Creation** | 20 mins | 5 mins (Review only) |
| **Social Posting**| 10 mins | 2 mins (Approve only) |
| **Data Ingestion**| Automated | 100% Uptime |
| **Lead Routing**  | Partial | 100% Automated |

---

## 📝 Operating Manual: The "No-Desperation" Rule
- Never send automated marketing to the same person >2x per week.
- If an investor says "No thanks," respect it — no aggressive follow-up.
- High-trust advisory = High quality over high quantity.
