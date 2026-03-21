import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'

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
