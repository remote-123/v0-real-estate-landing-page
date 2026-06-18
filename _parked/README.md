# Parked Pages

Moved out of `app/` on 2026-06-18 when northcapitaldxb.com was consolidated as a pure data intelligence terminal. Code is intact — nothing deleted.

## What's here

### Pages (`_parked/app/`)
| Directory | Route | Description |
|-----------|-------|-------------|
| `about/` | `/about` | North Capital about page |
| `blog/` | `/blog`, `/blog/[slug]` | Blog listing + Sanity-powered posts |
| `areas/` | `/areas`, `/areas/[slug]` | Dubai areas directory + detail pages |
| `contact/` | `/contact` | Contact form |
| `services/` | `/services` | Services/offerings page |
| `glossary/` | `/glossary` | Real estate glossary |
| `projects/` | `/projects`, `/projects/[slug]` | Off-plan project listings |
| `tools/` | `/tools/*` | Calculator hub (mortgage, rental yield, DLD fee, golden visa, off-plan, service charge) |
| `calculator/` | `/calculator` | Legacy calculator redirect |

### API Routes (`_parked/app/api/`)
| Directory | Description |
|-----------|-------------|
| `ai-blog-generator/` | Gemini blog generation from Gmail trigger |
| `blog-from-url/` | Blog post from URL scrape |
| `contact/` | Contact form handler |
| `cron/generate-blog-posts/` | Reddit-signal blog generation cron |
| `leads/` | email-capture, unsubscribe, whatsapp-intent |
| `project-pdf-email/` | PDF brochure email handler |
| `project-pdf-upload/` | PDF upload + Gemini extraction |
| `reddit-monitor/` | Reddit signal scraper cron |

## Migration notes for future sessions

### Tools → Terminal integration ideas
- Mortgage calculator, rental yield calculator → could live as lightweight pages under `/terminal/tools/` once the terminal has a content hub
- Off-plan payment calculator → relevant to terminal's supply-pipeline data
- Service charge estimator → natural companion to `/terminal/service-charges`

### Blog → Data commentary
- Blog infrastructure (Sanity, slugs, OG images) is intact
- Could be repurposed as `/terminal/research` or `/terminal/reports` for market commentary

### Areas → Community detail pages
- `/areas/[slug]` may overlap with `/terminal/communities/[slug]` — consolidate rather than restore

### To restore a page: move the directory back into `app/` and it routes automatically.
