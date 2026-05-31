import { NextRequest, NextResponse } from "next/server"

const CITY_REGISTRY_HOSTS = ["thecityregistry.com", "www.thecityregistry.com"]

// Paths that exist for the agency brand but should 404 on the data terminal
const BLOCKED_ON_CITY_REGISTRY = [
  "/about",
  "/contact",
  "/services",
  "/blog",
  "/areas",
  "/projects",
  "/calculator",
  "/tools",
  "/glossary",
]

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? ""
  const isCityRegistry = CITY_REGISTRY_HOSTS.some((h) => host.includes(h))
  const { pathname } = request.nextUrl

  // Redirect blocked marketing pages to /terminal on cityregistry domain
  if (isCityRegistry) {
    const isBlocked = BLOCKED_ON_CITY_REGISTRY.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    )
    if (isBlocked) {
      return NextResponse.redirect(new URL("/terminal", request.url), 308)
    }
  }

  // Pass x-site header downstream so pages can branch on brand
  const response = NextResponse.next()
  response.headers.set("x-site", isCityRegistry ? "cityregistry" : "northcapital")
  return response
}

export const config = {
  matcher: [
    // Run on all paths except static assets and Next internals
    "/((?!_next/static|_next/image|favicon.ico|images/|icons/|fonts/).*)",
  ],
}
