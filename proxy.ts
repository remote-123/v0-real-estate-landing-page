import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const CITY_REGISTRY_HOSTS = ["thecityregistry.com", "www.thecityregistry.com"]

// Pages that belong to NorthCapital only — redirect away from cityregistry
const NORTHCAPITAL_ONLY_PATHS = ["/blog", "/projects", "/services", "/about", "/contact", "/calculator", "/glossary", "/areas", "/sign-in"]

// Pages that belong to City Registry only — redirect away from northcapital
const CITYREGISTRY_ONLY_PATHS = ["/terminal"]

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? ""
  const { pathname, searchParams } = req.nextUrl

  // Dev preview: ?site=cityregistry on localhost bypasses host check
  const devSite = process.env.NODE_ENV === "development" ? searchParams.get("site") : null
  const isCityRegistry = devSite === "cityregistry" || CITY_REGISTRY_HOSTS.some((h) => host.includes(h))

  if (isCityRegistry) {
    // City Registry root → landing page (handled by app/page.tsx with isCityRegistry check)
    // Block NorthCapital-only paths → redirect to northcapitaldxb.com
    const isNorthCapitalPath = NORTHCAPITAL_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
    if (isNorthCapitalPath) {
      return NextResponse.redirect(`https://www.northcapitaldxb.com${pathname}`)
    }
  } else if (!devSite) {
    // NorthCapital: redirect /terminal/* → thecityregistry.com/terminal/*
    // (skip in dev preview mode so terminal pages remain accessible locally)
    const isTerminalPath = CITYREGISTRY_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
    if (isTerminalPath) {
      return NextResponse.redirect(`https://thecityregistry.com${pathname}`)
    }
  }

  const res = NextResponse.next()
  res.headers.set("x-site", isCityRegistry ? "cityregistry" : "northcapital")
  return res
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|icons|robots.txt|sitemap.xml).*)",
  ],
}
