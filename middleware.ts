import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // Only require auth for the admin page and the import API
  if (req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/api/import-pdf')) {
    const basicAuth = req.headers.get('authorization')
    const url = req.nextUrl

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')

      // Set these in your Vercel Environment Variables!
      const validUser = process.env.ADMIN_USERNAME || 'north'
      const validPwd = process.env.ADMIN_PASSWORD || 'northern'

      if (user === validUser && pwd === validPwd) {
        return NextResponse.next()
      }
    }

    // Trigger the browser's native login popup
    url.pathname = '/api/auth'
    return new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    })
  }
}