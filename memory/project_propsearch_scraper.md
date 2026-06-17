---
name: PropSearch Scraper Initiative
description: propsearch.ae 3-stage scraping pipeline — keep and complete after DB migration
type: project
---

Scraping propsearch.ae in 3 stages to enrich building data. Work started, never completed. Keep all code.

**Status**: Partially built, paused. Resume after DO DB migration is done.

**Why:** Enrich terminal app with building-level detail (developer, floors, units, amenities, completion). DLD buildings registry has ~168k rows but lacks this richness.

**Code already built:**
- `app/api/cron/prop-areas/route.ts` — Stage 1: scrapes area list → `prop_areas` table
- `app/api/cron/prop-buildings/route.ts` — Stage 2: building list per area → `prop_buildings`
- `app/api/cron/prop-building-details/route.ts` — Stage 3: individual building pages → `prop_building_details`
- `scripts/prop-buildings-heartbeat.ts` — local CLI runner for all 3 stages

**Tables:** `prop_areas`, `prop_buildings`, `prop_building_details`

**Next steps (post-migration):**
1. Verify tables exist on DO after migration
2. Run Stage 1 + 2 to populate areas + buildings
3. Run Stage 3 in batches to fill building details
4. Wire `prop_building_details` into building-comparator or a new terminal page

**How to apply:** When user asks about building data enrichment or propsearch, resume this work.
