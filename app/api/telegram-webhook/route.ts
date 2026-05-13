import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { sql } from '@/lib/db'
import { createClient } from 'next-sanity'

export const maxDuration = 120

const URL_REGEX = /https?:\/\/[^\s]+/i

const sanityWrite = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-02-24',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

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

/** Normalize bedroom input → DLD rooms_en label. */
function toBedLabel(raw: string): string | null {
    const n = parseInt(raw, 10)
    if (raw.toLowerCase().startsWith('s') || n === 0) return 'Studio'
    if (n >= 1 && n <= 4) return `${n} B/R`
    if (n >= 5) return '5+ B/R'
    return null
}

async function handleAreaCommand(areaArg: string, chatId: string | number, threadId?: number) {
    if (!areaArg) {
        await replyToChat(chatId, 'Usage: <code>/area [name]</code>\nExample: <code>/area downtown dubai</code>', threadId)
        return
    }
    try {
        const pattern = `%${areaArg}%`
        const rows = await sql<{
            area_name_en: string
            curr_psf: string
            yoy_pct: string | null
            txn_12m: string
            latest_month: string
        }[]>`
            WITH latest AS (
                SELECT MAX(txn_month) AS m
                FROM mv_txn_monthly_unified
                WHERE trans_group_en = 'Sales'
            ),
            monthly AS (
                SELECT
                    area_name_en,
                    txn_month,
                    SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS avg_psm,
                    SUM(txn_count) AS vol
                FROM mv_txn_monthly_unified
                CROSS JOIN latest
                WHERE trans_group_en = 'Sales'
                    AND property_type_en = 'Unit'
                    AND area_name_en ILIKE ${pattern}
                    AND txn_month >= latest.m - INTERVAL '13 months'
                GROUP BY area_name_en, txn_month
            ),
            curr AS (
                SELECT area_name_en, avg_psm, vol
                FROM monthly CROSS JOIN latest
                WHERE txn_month = latest.m
            ),
            year_ago AS (
                SELECT area_name_en, avg_psm AS psm_ya
                FROM monthly CROSS JOIN latest
                WHERE txn_month = latest.m - INTERVAL '12 months'
            ),
            rolling_12m AS (
                SELECT area_name_en, SUM(vol) AS txn_12m
                FROM monthly CROSS JOIN latest
                WHERE txn_month >= latest.m - INTERVAL '11 months'
                GROUP BY area_name_en
            )
            SELECT
                c.area_name_en,
                ROUND((c.avg_psm / 10.764)::numeric, 0)::integer AS curr_psf,
                ROUND(((c.avg_psm - y.psm_ya) / NULLIF(y.psm_ya, 0) * 100)::numeric, 1) AS yoy_pct,
                r.txn_12m::integer AS txn_12m,
                latest.m::text AS latest_month
            FROM curr c
            JOIN year_ago y USING (area_name_en)
            JOIN rolling_12m r USING (area_name_en)
            CROSS JOIN latest
            WHERE c.avg_psm > 0 AND y.psm_ya > 0
            ORDER BY c.vol DESC
            LIMIT 1
        `

        if (!rows[0]) {
            await replyToChat(chatId, `No data found for "<b>${areaArg}</b>".\nTry the full area name, e.g. <code>/area downtown dubai</code>`, threadId)
            return
        }

        const r = rows[0]
        const yoy = r.yoy_pct != null ? Number(r.yoy_pct) : null
        const yoyStr = yoy != null
            ? `${yoy >= 0 ? '📈' : '📉'} YoY: <code>${yoy >= 0 ? '+' : ''}${yoy}%</code>`
            : '📊 YoY: <code>N/A</code>'
        const month = r.latest_month.slice(0, 7) // YYYY-MM

        const msg =
            `<b>${r.area_name_en.toUpperCase()}</b>\n` +
            `📅 Data as of: ${month}\n\n` +
            `💰 Avg PSF: <code>${Number(r.curr_psf).toLocaleString()} AED/sqft</code>\n` +
            `${yoyStr}\n` +
            `📊 12m Transactions: <code>${Number(r.txn_12m).toLocaleString()}</code>`

        await replyToChat(chatId, msg, threadId)
    } catch (err: any) {
        await replyToChat(chatId, `❌ Area query failed: <code>${err.message}</code>`, threadId)
    }
}

async function handleDistressCommand(chatId: string | number, threadId?: number) {
    try {
        const rows = await sql<{
            title: string
            location: string
            current_price: string
            psf: string
            dld_area_avg_psf: string | null
            distress_score: string
            days_on_market: string
            bedrooms: string | null
        }[]>`
            SELECT
                title,
                COALESCE(area_name, building_name, address_full, 'Dubai') AS location,
                current_price,
                psf,
                dld_area_avg_psf,
                distress_score,
                days_on_market,
                bedrooms::text AS bedrooms
            FROM distress_listings
            WHERE disappeared_at IS NULL
                AND price_drop_confirmed = true
            ORDER BY distress_score DESC
            LIMIT 5
        `

        if (!rows.length) {
            await replyToChat(chatId, 'No confirmed distress deals at this time.', threadId)
            return
        }

        const lines = rows.map((r, i) => {
            const price = Number(r.current_price)
            const priceStr = price >= 1_000_000
                ? `AED ${(price / 1_000_000).toFixed(2)}M`
                : `AED ${Math.round(price / 1_000)}K`
            const psf = Number(r.psf)
            const areaAvg = r.dld_area_avg_psf ? Number(r.dld_area_avg_psf) : null
            const discount = areaAvg && areaAvg > 0
                ? ` (${Math.round((areaAvg - psf) / areaAvg * 100)}% below avg)`
                : ''
            const beds = r.bedrooms ? `${r.bedrooms}BR · ` : ''
            return `<b>${i + 1}. ${r.title.slice(0, 60)}</b>\n` +
                `   ${beds}${r.location} · ${priceStr}\n` +
                `   PSF: ${Math.round(psf)}${discount} · DOM: ${r.days_on_market}d · Score: ${Math.round(Number(r.distress_score))}`
        }).join('\n\n')

        await replyToChat(chatId, `<b>🔴 Top Distress Deals</b>\n\n${lines}\n\n<i>See /terminal/distress-deals for full list</i>`, threadId)
    } catch (err: any) {
        await replyToChat(chatId, `❌ Distress query failed: <code>${err.message}</code>`, threadId)
    }
}

async function handlePriceCommand(args: string[], chatId: string | number, threadId?: number) {
    // /price [area...] [beds] — beds is the last token
    if (args.length < 2) {
        await replyToChat(chatId, 'Usage: <code>/price [area] [beds]</code>\nExample: <code>/price downtown dubai 2</code>', threadId)
        return
    }
    const bedRaw = args[args.length - 1]
    const bedLabel = toBedLabel(bedRaw)
    if (!bedLabel) {
        await replyToChat(chatId, `Unknown bedroom count "<b>${bedRaw}</b>". Use 0 (Studio), 1, 2, 3, 4, or 5.`, threadId)
        return
    }
    const areaArg = args.slice(0, -1).join(' ')
    const pattern = `%${areaArg}%`

    try {
        const rows = await sql<{
            area_name_en: string
            rooms_en: string
            avg_psf: string
            avg_price: string
            txn_count: string
            latest_month: string
        }[]>`
            WITH latest AS (
                SELECT MAX(txn_month) AS m
                FROM mv_txn_monthly_unified
                WHERE trans_group_en = 'Sales'
            )
            SELECT
                area_name_en,
                rooms_en,
                ROUND((SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) / 10.764)::numeric, 0)::integer AS avg_psf,
                ROUND((SUM(txn_count * avg_price) / NULLIF(SUM(txn_count), 0))::numeric, 0)::integer AS avg_price,
                SUM(txn_count)::integer AS txn_count,
                latest.m::text AS latest_month
            FROM mv_txn_monthly_unified
            CROSS JOIN latest
            WHERE trans_group_en = 'Sales'
                AND property_type_en = 'Unit'
                AND area_name_en ILIKE ${pattern}
                AND rooms_en = ${bedLabel}
                AND txn_month >= latest.m - INTERVAL '11 months'
            GROUP BY area_name_en, rooms_en, latest.m
            HAVING SUM(txn_count) >= 5
            ORDER BY SUM(txn_count) DESC
            LIMIT 1
        `

        if (!rows[0]) {
            await replyToChat(chatId, `No price data for <b>${bedLabel}</b> in "<b>${areaArg}</b>".\nTry a broader area name.`, threadId)
            return
        }

        const r = rows[0]
        const month = r.latest_month.slice(0, 7)
        const avgPrice = Number(r.avg_price)
        const priceStr = avgPrice >= 1_000_000
            ? `AED ${(avgPrice / 1_000_000).toFixed(2)}M`
            : `AED ${Math.round(avgPrice / 1_000)}K`

        const msg =
            `<b>${r.area_name_en.toUpperCase()} — ${bedLabel}</b>\n` +
            `📅 Rolling 12m to ${month}\n\n` +
            `💰 Avg Price: <code>${priceStr}</code>\n` +
            `📐 Avg PSF: <code>${Number(r.avg_psf).toLocaleString()} AED/sqft</code>\n` +
            `📊 Transactions: <code>${Number(r.txn_count).toLocaleString()}</code>`

        await replyToChat(chatId, msg, threadId)
    } catch (err: any) {
        await replyToChat(chatId, `❌ Price query failed: <code>${err.message}</code>`, threadId)
    }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    })
}

async function editMessageText(chatId: string | number, messageId: number, text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' }),
    })
}

async function handleBlogCallback(action: string, draftId: string, chatId: string | number, messageId: number) {
    if (action === 'skip') {
        await editMessageText(chatId, messageId, `❌ <b>Skipped</b>\n<code>${draftId}</code>`)
        return
    }

    // action === 'publish'
    try {
        const draft = await sanityWrite.getDocument(draftId)
        if (!draft) {
            await editMessageText(chatId, messageId, `⚠️ Draft not found: <code>${draftId}</code>`)
            return
        }

        // Published ID = strip "drafts." prefix
        const publishedId = draftId.replace(/^drafts\./, '')
        const { _id: _ignoredId, ...rest } = draft
        await sanityWrite.createOrReplace({ ...rest, _id: publishedId })
        await sanityWrite.delete(draftId)

        await editMessageText(chatId, messageId, `✅ <b>Published</b>\n<b>${draft.title ?? publishedId}</b>`)
    } catch (err: any) {
        await editMessageText(chatId, messageId, `❌ Publish failed: <code>${err.message?.slice(0, 200)}</code>`)
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

        // Handle inline keyboard button presses
        if (update?.callback_query) {
            const cq = update.callback_query
            const fromId = String(cq.from?.id ?? '')
            const allowedId = process.env.TELEGRAM_ALLOWED_USER_ID?.trim()
            if (allowedId && fromId !== allowedId) {
                await answerCallbackQuery(cq.id, '⛔ Not authorized')
                return NextResponse.json({ ok: true })
            }

            const [action, ...rest] = (cq.data ?? '').split(':')
            const draftId = rest.join(':')

            await answerCallbackQuery(cq.id)
            waitUntil(handleBlogCallback(action, draftId, cq.message.chat.id, cq.message.message_id))
            return NextResponse.json({ ok: true })
        }

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

        if (text.startsWith('/area ') || text === '/area') {
            const areaArg = text.replace(/^\/area(@\S+)?\s*/, '').trim()
            waitUntil(handleAreaCommand(areaArg, chatId, threadId))
            return NextResponse.json({ ok: true })
        }

        if (text === '/distress' || text.startsWith('/distress@')) {
            waitUntil(handleDistressCommand(chatId, threadId))
            return NextResponse.json({ ok: true })
        }

        if (text.startsWith('/price ') || text === '/price') {
            const args = text.replace(/^\/price(@\S+)?\s*/, '').trim().split(/\s+/).filter(Boolean)
            waitUntil(handlePriceCommand(args, chatId, threadId))
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
