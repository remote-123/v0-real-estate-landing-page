import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { sql } from '@/lib/db'

export const maxDuration = 120

const URL_REGEX = /https?:\/\/[^\s]+/i

async function replyToChat(chatId: string | number, text: string, threadId?: number) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return

    const payload: any = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
    }
    if (threadId) payload.message_thread_id = threadId

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
}

async function processBlog(url: string, chatId: string | number, threadId?: number) {
    try {
        const baseUrl = 'https://www.northcapitaldxb.com'
        const res = await fetch(`${baseUrl}/api/blog-from-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: process.env.BLOG_GENERATOR_SECRET,
                url,
            }),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
            await replyToChat(chatId, `❌ Blog generation failed:\n<code>${data.error || 'Unknown error'}</code>`, threadId)
            return
        }

        const studioUrl = `https://northcapitaldxb.sanity.studio/desk/post`
        await replyToChat(
            chatId,
            `✅ <b>Draft created in Sanity</b>\n\n<b>${data.title}</b>\n\n<a href="${studioUrl}">Open Sanity Studio →</a>`,
            threadId
        )
    } catch (err: any) {
        await replyToChat(chatId, `❌ Unexpected error: <code>${err.message}</code>`, threadId)
    }
}

async function handleLeadsCommand(chatId: string | number, threadId?: number) {
    try {
        const [emailRows, waRows] = await Promise.all([
            sql<{ total: string; last_5: string[] }[]>`
                SELECT
                    COUNT(*)::integer AS total,
                    ARRAY(
                        SELECT email FROM email_leads
                        WHERE unsubscribed_at IS NULL
                        ORDER BY subscribed_at DESC
                        LIMIT 5
                    ) AS last_5
                FROM email_leads
                WHERE unsubscribed_at IS NULL
            `,
            sql<{ total: string; today: string }[]>`
                SELECT
                    COUNT(*)::integer AS total,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::integer AS today
                FROM whatsapp_intents
            `,
        ])

        const emailTotal = Number(emailRows[0]?.total ?? 0)
        const last5 = (emailRows[0]?.last_5 ?? []).join('\n  • ')
        const waTotal = Number(waRows[0]?.total ?? 0)
        const waToday = Number(waRows[0]?.today ?? 0)

        const msg =
            `<b>Leads Report</b>\n\n` +
            `<b>Email Leads</b>\n` +
            `Active subscribers: <code>${emailTotal}</code>\n` +
            (last5 ? `Recent:\n  • ${last5}\n\n` : '\n') +
            `<b>WhatsApp Intents</b>\n` +
            `Total: <code>${waTotal}</code>\n` +
            `Today: <code>${waToday}</code>`

        await replyToChat(chatId, msg, threadId)
    } catch (err: any) {
        await replyToChat(chatId, `❌ Leads query failed: <code>${err.message}</code>`, threadId)
    }
}

async function handleBriefingCommand(chatId: string | number, threadId?: number) {
    try {
        const rows = await sql<{ content: string; generated_at: string }[]>`
            SELECT content, generated_at::text
            FROM market_briefings
            ORDER BY generated_at DESC
            LIMIT 1
        `

        if (!rows[0]) {
            await replyToChat(chatId, 'No briefing found. Run the generate-market-briefing cron to create one.', threadId)
            return
        }

        const { content, generated_at } = rows[0]
        const preview = content.slice(0, 800)
        const date = new Date(generated_at).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
        }) + ' UTC'

        const msg = `<b>Latest Market Briefing</b>\n<i>${date}</i>\n\n${preview}${content.length > 800 ? '…' : ''}`
        await replyToChat(chatId, msg, threadId)
    } catch (err: any) {
        await replyToChat(chatId, `❌ Briefing query failed: <code>${err.message}</code>`, threadId)
    }
}

export async function POST(req: Request) {
    try {
        // Verify Telegram webhook secret
        const webhookSecret = req.headers.get('x-telegram-bot-api-secret-token')
        const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
        if (expectedSecret && webhookSecret !== expectedSecret) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const update = await req.json()
        const message = update?.message

        if (!message?.text) {
            return NextResponse.json({ ok: true })
        }

        const chatId = message.chat.id
        const threadId = message.message_thread_id
        const fromId = String(message.from?.id ?? '')
        const allowedId = process.env.TELEGRAM_ALLOWED_USER_ID?.trim()

        if (allowedId && fromId !== allowedId) {
            return NextResponse.json({ ok: true })
        }

        const text: string = message.text.trim()

        // Bot commands
        if (text === '/leads' || text.startsWith('/leads@')) {
            waitUntil(handleLeadsCommand(chatId, threadId))
            return NextResponse.json({ ok: true })
        }

        if (text === '/briefing' || text.startsWith('/briefing@')) {
            waitUntil(handleBriefingCommand(chatId, threadId))
            return NextResponse.json({ ok: true })
        }

        const urlMatch = text.match(URL_REGEX)
        if (!urlMatch) {
            return NextResponse.json({ ok: true })
        }

        const url = urlMatch[0].replace(/[.,;)]+$/, '')

        // Acknowledge immediately — this is what Telegram waits for
        await replyToChat(chatId, `⏳ Got it. Generating blog post from:\n<code>${url.slice(0, 80)}</code>\n\nI'll reply when it's ready (~30s).`, threadId)

        // Process in the background — Vercel keeps the function alive until done
        // but returns 200 to Telegram immediately, preventing retries
        waitUntil(processBlog(url, chatId, threadId))

        return NextResponse.json({ ok: true })

    } catch (err: any) {
        console.error('[telegram-webhook] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
