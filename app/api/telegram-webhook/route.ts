import { NextResponse } from 'next/server'
import { sendTelegram } from '@/lib/telegram'

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

export async function POST(req: Request) {
    try {
        // Verify Telegram webhook secret (set via setWebhook?secret_token=...)
        const webhookSecret = req.headers.get('x-telegram-bot-api-secret-token')
        if (process.env.TELEGRAM_WEBHOOK_SECRET && webhookSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const update = await req.json()
        const message = update?.message

        // Only handle text messages
        if (!message?.text) {
            return NextResponse.json({ ok: true })
        }

        const chatId = message.chat.id
        const threadId = message.message_thread_id
        const text: string = message.text.trim()

        // Extract URL from message
        const urlMatch = text.match(URL_REGEX)
        if (!urlMatch) {
            // Not a URL — ignore silently (could add help text here)
            return NextResponse.json({ ok: true })
        }

        const url = urlMatch[0].replace(/[.,;)]+$/, '') // strip trailing punctuation

        // Acknowledge immediately
        await replyToChat(chatId, `⏳ Got it. Fetching <code>${url.slice(0, 60)}...</code>\n\nGenerating blog post — this takes ~30s.`, threadId)

        // Trigger the blog-from-url pipeline
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://northcapitaldxb.com'
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
            return NextResponse.json({ ok: true })
        }

        const studioUrl = `https://northcapitaldxb.sanity.studio/desk/post`
        await replyToChat(
            chatId,
            `✅ <b>Draft created in Sanity</b>\n\n<b>${data.title}</b>\n\n<a href="${studioUrl}">Open Sanity Studio →</a>`,
            threadId
        )

        return NextResponse.json({ ok: true })

    } catch (err: any) {
        console.error('[telegram-webhook] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
