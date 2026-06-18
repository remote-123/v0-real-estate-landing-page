/**
 * GET /api/leads/unsubscribe?token=<base64url-encoded-email>
 *
 * One-click unsubscribe link included in every digest email.
 * Token = Buffer.from(email).toString('base64url') — no HMAC needed for opt-out.
 * Sets unsubscribed_at on the matching email_leads row and shows a confirmation page.
 *
 * Legally required before sending commercial email (CAN-SPAM / GDPR).
 */

import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return htmlResponse('Missing unsubscribe token.', 400)
  }

  let email: string
  try {
    email = Buffer.from(token, 'base64url').toString('utf-8')
  } catch {
    return htmlResponse('Invalid unsubscribe token.', 400)
  }

  // Basic email sanity check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return htmlResponse('Invalid unsubscribe token.', 400)
  }

  try {
    const result = await sql`
      UPDATE email_leads
      SET unsubscribed_at = now()
      WHERE email = ${email.toLowerCase()}
        AND unsubscribed_at IS NULL
      RETURNING id
    `

    if (result.length === 0) {
      // Either already unsubscribed or email not found — treat as success
      return htmlResponse(`${email} is already unsubscribed or not found.`, 200)
    }

    return htmlResponse(`${email} has been unsubscribed. You will no longer receive digest emails from North Capital DXB.`, 200)
  } catch (err) {
    console.error('[unsubscribe] DB error:', err)
    return htmlResponse('An error occurred. Please try again or contact support.', 500)
  }
}

function htmlResponse(message: string, status: number): NextResponse {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribe — North Capital DXB</title>
  <style>
    body { font-family: Georgia, serif; max-width: 480px; margin: 80px auto; padding: 0 24px; color: #1a1a1a; }
    h1 { font-size: 1.25rem; margin-bottom: 12px; }
    p { color: #555; line-height: 1.6; }
    a { color: #059669; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <p style="font-family:monospace;font-size:11px;color:#888;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:24px">
    NORTH CAPITAL DXB
  </p>
  <h1>Unsubscribe</h1>
  <p>${message}</p>
  <p style="margin-top:24px"><a href="https://www.northcapitaldxb.com/terminal">Back to Terminal</a></p>
</body>
</html>`

  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
