import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(req: NextRequest) {
  const res = NextResponse.next()
  res.headers.set("x-site", "northcapital")
  return res
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|icons|robots.txt|sitemap.xml).*)",
  ],
}
