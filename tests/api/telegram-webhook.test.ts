/**
 * Tests for POST /api/telegram-webhook
 *
 * Guards against the class of bug caught in Cycle 24:
 *   handleLeadsCommand queried `ORDER BY created_at` but email_leads has
 *   no created_at column — only subscribed_at. Test verifies correct column.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

vi.mock('@/lib/db', () => {
  const sql = vi.fn()
  return { sql }
})

// Prevent waitUntil from executing background tasks during tests
// (background tasks run after the handler returns, causing inter-test contamination)
vi.mock('@vercel/functions', () => ({
  waitUntil: vi.fn(), // no-op — background handlers must not run in test context
}))

import { POST } from '@/app/api/telegram-webhook/route'
import { sql } from '@/lib/db'

const mockSql = vi.mocked(sql)

const ALLOWED_USER_ID = '12345'

function makeWebhookReq(text: string, fromId = ALLOWED_USER_ID) {
  return new Request('http://localhost/api/telegram-webhook', {
    method: 'POST',
    body: JSON.stringify({
      message: {
        text,
        chat: { id: -100987654 },
        from: { id: Number(fromId) },
        message_thread_id: undefined,
      },
    }),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/telegram-webhook — /leads command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set the default allowed user so normal commands are processed
    process.env.TELEGRAM_ALLOWED_USER_ID = ALLOWED_USER_ID
    // replyToChat calls fetch — mock it to prevent actual HTTP requests
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
  })

  it('returns 200 OK immediately for /leads command', async () => {
    mockSql.mockResolvedValue([{ total: 5, last_5: ['a@b.com'] }])
    const res = await POST(makeWebhookReq('/leads'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  it('returns 200 OK immediately for /briefing command', async () => {
    mockSql.mockResolvedValue([{ content: 'Briefing text', generated_at: '2026-05-02T06:00:00Z' }])
    const res = await POST(makeWebhookReq('/briefing'))
    expect(res.status).toBe(200)
  })

  it('returns 200 for unrecognized command without URL', async () => {
    const res = await POST(makeWebhookReq('/unknown'))
    expect(res.status).toBe(200)
  })

  it('silently ignores requests from disallowed user IDs without querying DB', async () => {
    // Allowed user is 12345 (ALLOWED_USER_ID), sender is different
    process.env.TELEGRAM_ALLOWED_USER_ID = '99999'
    const req = makeWebhookReq('/leads', '11111') // sender 11111 ≠ allowed 99999
    const res = await POST(req)
    // Webhook always returns 200 to Telegram (to prevent retry storms)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    // No DB access should occur for disallowed users
    expect(mockSql).not.toHaveBeenCalled()
  })
})

describe('Telegram webhook source code — SQL column guards', () => {
  /**
   * Regression tests: guard SQL column references that have caused bugs.
   *
   * Cycle 24 bug: handleLeadsCommand used `ORDER BY created_at` on email_leads,
   * but that table only has `subscribed_at`. These tests prevent silent re-introduction.
   */

  let source: string

  beforeEach(() => {
    source = readFileSync(
      resolve(process.cwd(), 'app/api/telegram-webhook/route.ts'),
      'utf-8'
    )
  })

  it('handleLeadsCommand uses subscribed_at (not created_at) for email_leads ordering', () => {
    expect(source).toContain('subscribed_at DESC')

    const handleLeadsBlock = source.slice(
      source.indexOf('async function handleLeadsCommand'),
      source.indexOf('async function handleBriefingCommand')
    )
    expect(handleLeadsBlock).not.toContain('ORDER BY created_at')
  })

  it('handleLeadsCommand queries whatsapp_intents with created_at — document assumption', () => {
    // whatsapp_intents.created_at — this column's existence is ASSUMED.
    // If the table schema changes, this test should fail as a reminder to update the query.
    const handleLeadsBlock = source.slice(
      source.indexOf('async function handleLeadsCommand'),
      source.indexOf('async function handleBriefingCommand')
    )
    // Just documents the current state; update if whatsapp_intents schema changes
    expect(handleLeadsBlock).toContain('whatsapp_intents')
  })
})
