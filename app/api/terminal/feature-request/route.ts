import { NextResponse } from "next/server"
import { sendTelegram } from "@/lib/telegram"

// In-memory rate limiter: max 3 submissions per IP per 24h.
// Works on single-instance deployments; on serverless scale-out, each instance has its own map.
// Acceptable for a low-traffic feature request form. Upgrade to Upstash if abuse becomes an issue.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const MAX_PER_IP = 3
const WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

function checkRateLimit(ip: string): boolean {
    const now = Date.now()
    const entry = rateLimitMap.get(ip)
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
        return true
    }
    if (entry.count >= MAX_PER_IP) return false
    entry.count++
    return true
}

export async function POST(req: Request) {
    // Extract IP from forwarded header (Vercel sets x-forwarded-for)
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown"

    // Rate limit check
    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { error: "You've submitted too many requests today. Try again tomorrow." },
            { status: 429 }
        )
    }

    let body: any
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
    }

    const { idea, email, captchaQuestion, captchaAnswer, captchaExpected, hp } = body

    // Honeypot check — bots fill hidden fields, humans don't
    if (hp) {
        // Silently accept (don't reveal the trap) but don't process
        return NextResponse.json({ ok: true })
    }

    // Validate required fields
    if (!idea || typeof idea !== "string" || idea.trim().length < 10) {
        return NextResponse.json({ error: "Please describe your idea in a bit more detail." }, { status: 400 })
    }
    if (idea.length > 500) {
        return NextResponse.json({ error: "Idea must be 500 characters or fewer." }, { status: 400 })
    }

    // Math CAPTCHA validation
    const parsedAnswer = parseInt(captchaAnswer?.toString()?.trim() || "", 10)
    const expectedAnswer = parseInt(captchaExpected?.toString() || "", 10)
    if (isNaN(parsedAnswer) || parsedAnswer !== expectedAnswer) {
        return NextResponse.json({ error: "Incorrect answer to the verification question. Please try again." }, { status: 400 })
    }

    // Forward to Telegram so it lands in the same workspace as other notifications
    const submittedAt = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai" })
    const emailLine = email ? `\n📧 <i>${email}</i>` : ""
    const message =
        `💡 <b>TERMINAL FEATURE REQUEST</b>\n` +
        `🕐 ${submittedAt} (Dubai time)\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `${idea.trim()}` +
        emailLine

    await sendTelegram(message)

    return NextResponse.json({ ok: true })
}
