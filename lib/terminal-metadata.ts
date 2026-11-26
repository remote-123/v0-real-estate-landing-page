/**
 * Domain-aware metadata helper for terminal pages.
 * Returns the site name, metadataBase, and OG URL. Values are constant so
 * terminal pages stay statically cacheable (reading headers() here used to
 * force every terminal page to render on every request). The old
 * thecityregistry.com host split is retired; isCR is kept for callers.
 *
 * Usage:
 *   export async function generateMetadata() {
 *     return terminalPageMeta({ title: "Page Name", description: "...", path: "/terminal/..." })
 *   }
 */

import type { Metadata } from "next"

const SITE_NAME = "North Capital DXB"
const BASE = "https://www.northcapitaldxb.com"

/** Lightweight helper for pages that need site info without full metadata construction. */
export async function getTerminalSiteInfo(): Promise<{ siteName: string; base: string; isCR: boolean }> {
  return { isCR: false, siteName: SITE_NAME, base: BASE }
}

export async function terminalPageMeta(opts: {
  title: string       // page-specific part only — site suffix added automatically
  description: string
  path: string        // e.g. "/terminal/area-momentum"
}): Promise<Metadata> {
  const siteName = SITE_NAME
  const base = BASE

  return {
    title: `${opts.title} | ${siteName}`,
    description: opts.description,
    metadataBase: new URL(base),
    alternates: { canonical: opts.path },
    openGraph: {
      title: `${opts.title} | ${siteName}`,
      description: opts.description,
      url: `${base}${opts.path}`,
      siteName,
      images: [{ url: "/images/terminal-social.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${opts.title} | ${siteName}`,
      description: opts.description,
    },
  }
}
