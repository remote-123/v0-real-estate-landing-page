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

## SEO (Added 2026-05-01)
- `app/terminal/layout.tsx` → `generateMetadata()` — dynamic per domain
- `app/robots.ts` — domain-aware, points sitemap to correct host
- `app/sitemap.ts` — cityregistry returns terminal-only URLs (no blog/projects)
- Google Search Console: verified via TXT record + meta tag
  - TXT: `google-site-verification=mgQDqmDOOITUVlJEizKp0OHxHj44AwCgOX0EPWf9cf4`

## northcapitaldxb.com Change
Navbar shows "City Registry ↗" button linking to `https://thecityregistry.com`.

## Future
- City switcher: "Dubai" → city selector as more markets added (Toronto etc.)
- Separate GA property for cityregistry traffic isolation
