import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { sendTelegram } from '@/lib/telegram'
import { supabaseServer } from '@/lib/supabase-server'

export const maxDuration = 60

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// ─── Config ───────────────────────────────────────────────────────────────────

const TARGETS: { subreddit: string; keywords: string[]; mustContain?: string[] }[] = [
    // Local / Region-specific (High Intent)
    {
        subreddit: 'DubaiExpats',
        keywords: ['rent', 'buy', 'invest', 'apartment', 'villa', 'property', 'mortgage', 'landlord', 'tenancy', 'yield', 'area'],
    },
    {
        subreddit: 'dubai',
        keywords: ['real estate', 'property', 'rent increase', 'buy apartment', 'invest dubai', 'moving to dubai', 'renting'],
    },
    {
        subreddit: 'AbuDhabi',
        keywords: ['real estate', 'property', 'invest', 'dubai', 'buy apartment'],
    },
    {
        subreddit: 'UAE',
        keywords: ['property', 'real estate', 'investment', 'yield', 'buy'],
    },
    // Expat / Finance (Moderate Intent)
    {
        subreddit: 'expats',
        keywords: ['dubai property', 'dubai rent', 'dubai invest', 'uae real estate', 'buying in uae', 'living in dubai'],
    },
    {
        subreddit: 'ExpatFinance',
        keywords: ['dubai', 'uae property', 'tax free yield', 'dubai real estate'],
    },
    {
        subreddit: 'digitalnomad',
        keywords: ['dubai', 'tax free', 'uae living', 'rent in dubai'],
    },
    {
        subreddit: 'ExpatFIRE',
        keywords: ['dubai', 'uae', 'real estate yield', 'passive income uae'],
    },
    // HNW / Wealth (Strategy Focus)
    {
        subreddit: 'fatFIRE',
        keywords: ['dubai', 'uae', 'emirates', 'burj', 'tax free investment'],
        mustContain: ['dubai', 'uae', 'emirates'],
    },
    {
        subreddit: 'HENRYfinance',
        keywords: ['dubai', 'uae', 'tax residency'],
        mustContain: ['dubai', 'uae'],
    },
    {
        subreddit: 'Rich',
        keywords: ['dubai', 'real estate', 'investment property'],
        mustContain: ['dubai', 'invest'],
    },
    // Global Real Estate (Data Focus)
    {
        subreddit: 'RealEstateInvesting',
        keywords: ['dubai', 'overseas investment', 'international yield'],
        mustContain: ['dubai', 'uae'],
    },
    {
        subreddit: 'PropertyInvestment',
        keywords: ['dubai', 'international property'],
        mustContain: ['dubai'],
    },
]

// Min chars for a post to be worth replying to
const MIN_POST_LENGTH = 100
// Max age of posts we reply to (hours) - setting higher for HNW subreddits to catch slower threads
const MAX_POST_AGE_HOURS = 24
// Max subreddits to check in a SINGLE run (prevents rate limits / timeouts)
const TARGETS_PER_RUN = 6

// ─── Reddit helpers ────────────────────────────────────────────────────────────

async function searchSubreddit(subreddit: string, keyword: string): Promise<any[]> {
    // Reddit's public JSON search — no auth needed for reading
    const url = new URL(`https://www.reddit.com/r/${subreddit}/search.json`)
    url.searchParams.set('q', keyword)
    url.searchParams.set('sort', 'new')
    url.searchParams.set('restrict_sr', '1')
    url.searchParams.set('limit', '8')
    url.searchParams.set('t', 'day')

    const res = await fetch(url.toString(), {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        next: { revalidate: 0 },
    })

    if (!res.ok) {
        if (res.status === 429) console.error(`⚠️ Rate limited on r/${subreddit}`)
        return []
    }
    const data = await res.json()
    return (data?.data?.children || []).map((c: any) => c.data)
}

function isRecent(utcSeconds: number): boolean {
    const ageHours = (Date.now() / 1000 - utcSeconds) / 3600
    return ageHours <= MAX_POST_AGE_HOURS
}

async function getSeenPostIds(): Promise<Set<string>> {
    const { data } = await supabaseServer
        .from('reddit_seen_posts')
        .select('post_id')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    return new Set((data || []).map((r: any) => r.post_id))
}

// ─── Voice samples ─────────────────────────────────────────────────────────────

async function getVoiceSamples(limit = 6): Promise<string[]> {
    // Pull the highest-scored comments as style examples
    const { data } = await supabaseServer
        .from('reddit_voice_samples')
        .select('comment_body, score, subreddit')
        .gte('score', 1)           // Only upvoted comments — proven quality
        .order('score', { ascending: false })
        .limit(limit)

    if (!data || data.length === 0) return []
    return data.map((r: any) => r.comment_body)
}

// ─── Market data for grounding ─────────────────────────────────────────────────

async function getMarketSnapshot(): Promise<string> {
    // Pull a fresh snapshot of rental data to ground the reply in real numbers
    const { data } = await supabaseServer
        .from('rental_listings')
        .select('area, bedrooms, monthly_price, price_per_sqft')
        .gte('listed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(200)

    if (!data || data.length === 0) return 'No live data available.'

    // Compute avg monthly price per area × bedroom type (top 8 areas by volume)
    const areaMap = new Map<string, number[]>()
    for (const row of data) {
        if (!row.area || !row.monthly_price) continue
        const key = row.area
        if (!areaMap.has(key)) areaMap.set(key, [])
        areaMap.get(key)!.push(row.monthly_price)
    }

    const summaries = [...areaMap.entries()]
        .map(([area, prices]) => ({
            area,
            count: prices.length,
            avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(s => `${s.area}: AED ${s.avg.toLocaleString()}/mo avg (${s.count} listings)`)

    return summaries.join('\n')
}

// ─── Gemini reply generation ───────────────────────────────────────────────────

async function generateReply(
    post: { title: string; selftext: string; subreddit: string },
    voiceSamples: string[],
    marketData: string
): Promise<string> {
    const voiceBlock = voiceSamples.length > 0
        ? `Here are real examples of how I write on Reddit. Study the tone, sentence length, vocabulary, and the way I use data. Mirror this style exactly:

${voiceSamples.map((s, i) => `[EXAMPLE ${i + 1}]\n${s}`).join('\n\n')}`
        : 'Write in a direct, analytical tone. No fluff. Use data where you have it.'

    const prompt = `You are ghostwriting a Reddit reply for a Dubai real estate investment strategist. This is NOT a blog post or marketing copy — it's a Reddit comment. It must feel 100% human.

${voiceBlock}

LIVE MARKET DATA (use selectively — only if it's directly relevant to the question):
${marketData}

THE REDDIT POST (in r/${post.subreddit}):
Title: ${post.title}
${post.selftext ? `Body: ${post.selftext.substring(0, 800)}` : ''}

YOUR TASK:
Write a helpful, direct Reddit reply that:
1. Actually answers their question or adds useful perspective
2. Uses 1-2 real data points IF they're relevant (don't force it)
3. Sounds like a person who knows Dubai RE deeply, not an AI assistant
4. Is conversational — not structured like an essay
5. Is 80–200 words max (Reddit readers scan, they don't read)
6. Ends naturally — no CTA, no "feel free to ask more questions", no sign-off phrases
7. ONLY if the question is specifically about finding data, rentals, or investment analysis, add ONE short sentence at the end: "You can see live rental data at northcapitaldxb.com/terminal" — blend it naturally, don't make it feel bolted on

ABSOLUTE DO NOTs:
- Do NOT start with "Great question!"
- Do NOT use: delve, testament, game-changer, unparalleled, seamless, stunning, nestled
- Do NOT write in bullet points or headers
- Do NOT sound like ChatGPT
- Do NOT hallucinate data — only use the market data provided above

Return ONLY the reply text. Nothing else.`

    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { temperature: 0.85 }, // Higher temp = more natural variation
    })

    const result = await model.generateContent(prompt)
    return result.response.text().trim()
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const isTest = body.test === true

        if (!isTest && body.secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Gather seen post IDs to avoid duplicates (skip if testing)
        const seen = isTest ? new Set<string>() : await getSeenPostIds()

        // 2. Collect candidate posts from a SHUFFLED SUBSET of target subreddits
        // This allows us to scale to many subreddits without hitting rate limits
        const shuffled = [...TARGETS].sort(() => 0.5 - Math.random())
        const selected = isTest ? TARGETS : shuffled.slice(0, TARGETS_PER_RUN)

        const candidates: any[] = []
        for (const target of selected) {
            for (const keyword of target.keywords.slice(0, 3)) { // Limit API calls
                try {
                    const posts = await searchSubreddit(target.subreddit, keyword)
                    for (const post of posts) {
                        const content = (post.title + ' ' + (post.selftext || '')).toLowerCase()
                        
                        // Keyword match
                        const hasKeywords = target.keywords.some(kw => content.includes(kw.toLowerCase()))
                        
                        // Strict requirement match (e.g. for global subreddits)
                        const satisfiesMustContain = !target.mustContain || 
                            target.mustContain.some(must => content.includes(must.toLowerCase()))

                        if (
                            post.name &&
                            !seen.has(post.name) &&
                            (isTest || isRecent(post.created_utc)) &&
                            post.is_self === true && 
                            hasKeywords &&
                            satisfiesMustContain &&
                            content.length >= MIN_POST_LENGTH
                        ) {
                            candidates.push(post)
                        }
                    }
                } catch (err) {
                    console.warn(`Search failed for r/${target.subreddit} "${keyword}":`, err)
                }
                await new Promise(r => setTimeout(r, 500)) // Be polite to Reddit
            }
        }

        // Deduplicate by post ID and take top 3 freshest
        const unique = [...new Map(candidates.map(p => [p.name, p])).values()]
            .sort((a, b) => b.created_utc - a.created_utc)
            .slice(0, 3)

        if (unique.length === 0) {
            return NextResponse.json({ success: true, found: 0, message: 'No new posts to process' })
        }

        // 3. Load voice samples + market data once (shared across all replies)
        const [voiceSamples, marketData] = await Promise.all([
            getVoiceSamples(6),
            getMarketSnapshot(),
        ])

        if (voiceSamples.length === 0) {
            console.warn('⚠️ No voice samples found. Run scripts/extract-reddit-voice.ts first.')
        }

        // 4. Generate reply + send to Telegram for each post
        let sent = 0
        for (const post of unique) {
            try {
                const reply = await generateReply(
                    { title: post.title, selftext: post.selftext || '', subreddit: post.subreddit },
                    voiceSamples,
                    marketData
                )

                const postUrl = `https://reddit.com${post.permalink}`

                // Send to Telegram — formatted for easy copy-paste
                const tgMessage = [
                    `🤖 <b>Reddit Reply Draft</b>`,
                    `📌 <b>r/${post.subreddit}</b>`,
                    `<b>${post.title}</b>`,
                    `🔗 ${postUrl}`,
                    ``,
                    `─────────────────────────`,
                    `<b>COPY THIS REPLY:</b>`,
                    `─────────────────────────`,
                    `<code>${reply}</code>`,
                ].join('\n')

                await sendTelegram(tgMessage, process.env.TELEGRAM_THREAD_ID_REDDIT)

                // Mark as seen in Supabase
                await supabaseServer.from('reddit_seen_posts').upsert({
                    post_id: post.name,
                    subreddit: post.subreddit,
                    post_title: post.title,
                    post_url: postUrl,
                    post_body: post.selftext?.substring(0, 1000) || '',
                    generated_reply: reply,
                    telegram_sent: true,
                }, { onConflict: 'post_id' })

                sent++
                await new Promise(r => setTimeout(r, 1000)) // Stagger Telegram messages
            } catch (err) {
                console.error(`Failed to process post ${post.name}:`, err)
            }
        }

        return NextResponse.json({
            success: true,
            found: unique.length,
            sent,
            voiceSamples: voiceSamples.length,
        })
    } catch (error: any) {
        console.error('❌ Reddit Monitor Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
