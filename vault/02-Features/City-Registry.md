# thecityregistry.com

## Purpose
Data platform brand separate from northcapitaldxb.com (agency/advisory).
Goal: PropTech acquisition target (Bayut, CoStar, REA Group).
Same codebase, same Vercel project, same Neon DB.

## How It Works
`middleware.ts` reads `host` header:
- `thecityregistry.com` or `www.thecityregistry.com` → sets `x-site: cityregistry`
- Everything else → `x-site: northcapital`

## Behaviour Differences
| Feature | thecityregistry.com | northcapitaldxb.com |
|---|---|---|
| Root `/` | Redirects → `/terminal` | Homepage |
| Terminal header | "The City Registry / Dubai" | "Investor Terminal / v1.0.4" |
| Sidebar brand | "THE CITY REGISTRY" | "NORTH CAPITAL" |
| "Back to Site" link | Hidden | Shown |
| Book Appointment CTA | Hidden | Shown |
| WhatsApp button | Hidden | Shown |
| MobileStickyBar | Hidden | Shown |
| Meta title | "Dubai Real Estate Intelligence \| The City Registry" | "Investor Terminal \| North Capital DXB" |
| Schema.org type | DataCatalog (5 datasets) | Dataset |
| Canonical URL | thecityregistry.com | northcapitaldxb.com |

## D3 Refinitiv Theme (Implemented 2026-05-02)
Design: Charcoal #1C1C1E bg, #252527 card, #2c2c2e border, **#00BFA5 teal accent**, #000 accent-foreground.

**CSS system**: `.cityregistry` class in `globals.css` overrides all CSS vars. `CityRegistryTheme` client component sets class on `<html>` (not just layout div) so portalled elements (Sheet, createPortal modals) also inherit.

**Theme coverage** (commit 6cf7934): All ~120 hardcoded `emerald-*` / `#10b981` references across 38 files migrated to `text-accent` / `bg-accent` / `var(--accent, #10b981)`. NorthCapital unaffected — Recharts colors use CSS var with `#10b981` fallback.

**Invariant**: Never hardcode `#10b981` or `emerald-*` in unconditional (shared-site) code again. Use:
- Tailwind: `text-accent`, `bg-accent`, `border-accent`, `bg-accent/{opacity}`
- Recharts props: `"var(--accent, #10b981)"`
- Focus rings: `focus:ring-ring/50` (not `focus:ring-emerald-*`)

## SEO (Added 2026-05-01)
- `app/terminal/layout.tsx` → `generateMetadata()` — dynamic per domain
- `app/robots.ts` — domain-aware, points sitemap to correct host
- `app/sitemap.ts` — cityregistry returns terminal-only URLs (no blog/projects)
- Google Search Console: verified via TXT record + meta tag
  - TXT: `google-site-verification=mgQDqmDOOITUVlJEizKp0OHxHj44AwCgOX0EPWf9cf4`

## northcapitaldxb.com Change
Navbar shows "City Registry ↗" button linking to `https://thecityregistry.com`.

## Planned Split (ADR-006 — decided 2026-05-01, not yet built)
- NorthCapital drops `/terminal/*` entirely — 301 → thecityregistry.com
- City Registry gets thin landing page before terminal + email capture
- Blog moves to City Registry (data/market analysis content)
- NorthCapital becomes pure agency: agent roster, project showcase, lead gen CTAs
- Footer cross-link: "Investment enquiries → northcapitaldxb.com"

## Future
- City switcher: "Dubai" → city selector as more markets added (Toronto etc.)
- Separate GA property for cityregistry traffic isolation
