/**
 * Tests for lib/telegram.ts
 *
 * sendTelegram() and sendTelegramError() are wired into multiple cron routes
 * as the error reporting channel. These tests guard:
 *   - Missing config silently skips (never throws)
 *   - Correct payload shape sent to Telegram Bot API
 *   - message_thread_id only included when threadId is provided
 *   - API-level errors (non-ok response) are logged but do not throw
 *   - Network errors are swallowed (never propagate to caller)
 *   - sendTelegramError formats message with route/stage/error/context
 *   - sendTelegramError uses TELEGRAM_THREAD_ID_ERRORS when set
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { sendTelegram, sendTelegramError } from '@/lib/telegram'

const originalEnv = { ...process.env }

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) {
      delete process.env[k]
    } else {
      process.env[k] = v
    }
  }
}

describe('sendTelegram — missing config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_GROUP_CHAT_ID
    delete process.env.TELEGRAM_CHAT_ID
  })

  afterEach(() => {
    Object.assign(process.env, originalEnv)
  })

  it('does not call fetch when TELEGRAM_BOT_TOKEN is missing', async () => {
    setEnv({ TELEGRAM_GROUP_CHAT_ID: '-100123', TELEGRAM_BOT_TOKEN: undefined })
    await sendTelegram('test message')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('does not call fetch when chat ID is missing', async () => {
    setEnv({ TELEGRAM_BOT_TOKEN: 'bot123', TELEGRAM_GROUP_CHAT_ID: undefined, TELEGRAM_CHAT_ID: undefined })
    await sendTelegram('test message')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('does not throw when config is missing', async () => {
    await expect(sendTelegram('test message')).resolves.toBeUndefined()
  })
})

describe('sendTelegram — payload shape', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setEnv({ TELEGRAM_BOT_TOKEN: 'bot-token-123', TELEGRAM_GROUP_CHAT_ID: '-100987654' })
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
  })

  afterEach(() => {
    Object.assign(process.env, originalEnv)
  })

  it('sends POST to correct Telegram Bot API endpoint', async () => {
    await sendTelegram('hello')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.telegram.org/botbot-token-123/sendMessage',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('sends correct base payload without threadId', async () => {
    await sendTelegram('test text')
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body).toEqual({
      chat_id: '-100987654',
      text: 'test text',
      parse_mode: 'HTML',
    })
    // No message_thread_id when threadId not provided
    expect(body.message_thread_id).toBeUndefined()
  })

  it('includes message_thread_id when threadId is provided', async () => {
    await sendTelegram('threaded message', '42')
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.message_thread_id).toBe('42')
    expect(body.chat_id).toBe('-100987654')
  })

  it('uses Content-Type: application/json header', async () => {
    await sendTelegram('hello')
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
  })
})

describe('sendTelegram — error resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setEnv({ TELEGRAM_BOT_TOKEN: 'bot-token-123', TELEGRAM_GROUP_CHAT_ID: '-100987654' })
  })

  afterEach(() => {
    Object.assign(process.env, originalEnv)
  })

  it('does not throw when Telegram API returns non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    } as Response)
    await expect(sendTelegram('test')).resolves.toBeUndefined()
  })

  it('does not throw when fetch rejects (network error)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(sendTelegram('test')).resolves.toBeUndefined()
  })

  it('does not throw when fetch rejects with non-Error value', async () => {
    global.fetch = vi.fn().mockRejectedValue('network timeout')
    await expect(sendTelegram('test')).resolves.toBeUndefined()
  })
})

describe('sendTelegramError — message formatting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setEnv({ TELEGRAM_BOT_TOKEN: 'bot-token-123', TELEGRAM_GROUP_CHAT_ID: '-100987654' })
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
  })

  afterEach(() => {
    Object.assign(process.env, originalEnv)
  })

  it('includes route, stage, and error message in payload', async () => {
    await sendTelegramError('/api/cron/fetch-bayut', 'db_insert', new Error('duplicate key'))
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.text).toContain('/api/cron/fetch-bayut')
    expect(body.text).toContain('db_insert')
    expect(body.text).toContain('duplicate key')
  })

  it('handles non-Error thrown values (string errors)', async () => {
    await sendTelegramError('/api/test', 'parse', 'unexpected null')
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.text).toContain('unexpected null')
  })

  it('includes context key/value pairs when provided', async () => {
    await sendTelegramError('/api/test', 'fetch', new Error('404'), {
      area: 'Downtown Dubai',
      attempt: '3',
    })
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.text).toContain('Downtown Dubai')
    expect(body.text).toContain('attempt')
  })

  it('does not throw when context is omitted', async () => {
    await expect(
      sendTelegramError('/api/test', 'stage', new Error('err'))
    ).resolves.toBeUndefined()
  })

  it('truncates long error messages to 300 chars', async () => {
    const longMessage = 'x'.repeat(400)
    await sendTelegramError('/api/test', 'stage', new Error(longMessage))
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(options.body)
    // The error code block should not contain more than 300 'x' chars
    const match = body.text.match(/x+/)
    if (match) {
      expect(match[0].length).toBeLessThanOrEqual(300)
    }
  })
})

describe('sendTelegramError — thread routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setEnv({ TELEGRAM_BOT_TOKEN: 'bot-token-123', TELEGRAM_GROUP_CHAT_ID: '-100987654' })
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
  })

  afterEach(() => {
    Object.assign(process.env, originalEnv)
  })

  it('sends to TELEGRAM_THREAD_ID_ERRORS thread when env var is set', async () => {
    setEnv({ TELEGRAM_THREAD_ID_ERRORS: '77' })
    await sendTelegramError('/api/test', 'stage', new Error('err'))
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.message_thread_id).toBe('77')
  })

  it('sends without thread_id when TELEGRAM_THREAD_ID_ERRORS is not set', async () => {
    delete process.env.TELEGRAM_THREAD_ID_ERRORS
    await sendTelegramError('/api/test', 'stage', new Error('err'))
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.message_thread_id).toBeUndefined()
  })
})
