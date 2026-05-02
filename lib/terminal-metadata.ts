/**
 * Domain-aware metadata helper for terminal pages.
 * Reads x-site header (set by middleware.ts) and returns
 * the correct site name, metadataBase, and OG URL for
 * thecityregistry.com vs northcapitaldxb.com.
 *
 * Usage:
 *   export async function generateMetadata() {
 *     return terminalPageMeta({ title: "Page Name", description: "...", path: "/terminal/..." })
 *   }
 */

import { headers } from "next/headers"
import type { Metadata } from "next"

export async function terminalPageMeta(opts: {
  title: string       // page-specific part only — site suffix added automatically
  description: string
  path: string        // e.g. "/terminal/area-momentum"
}): Promise<Metadata> {
  const h = await headers()
  const isCR = (h.get("x-site") ?? "") === "cityregistry"
  const siteName = isCR ? "The City Registry" : "North Capital DXB"
  const base = isCR ? "https://thecityregistry.com" : "https://www.northcapitaldxb.com"

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
