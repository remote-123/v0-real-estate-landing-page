import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const CITY_REGISTRY_HOSTS = ["thecityregistry.com", "www.thecityregistry.com"]

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? ""
  const isCityRegistry = CITY_REGISTRY_HOSTS.some((h) => host.includes(h))

  // Redirect cityregistry.com root → /terminal
  if (isCityRegistry && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/terminal", req.url))
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
