import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from 'next-sanity'
import { sql } from '@/lib/db'
import { sendTelegram, sendTelegramError, sendTelegramWithButtons } from '@/lib/telegram'
import { NORTH_CAPITAL_SYSTEM_PROMPT, BLOG_JSON_FORMAT_RULE } from '@/lib/ai-guidelines'

export const maxDuration = 300

const genAI = new GoogleGenerativeAI(process.env.GEMINI_BLOG_API_KEY!)

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-02-24',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopicCandidate {
  id: string            // post_id for Reddit, URL for news
  source: 'reddit' | 'news'
  sourceLabel: string   // e.g. "r/DubaiExpats" or "Khaleej Times"
  title: string
  body: string          // full text / description
  url: string
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function ensureColumn() {
  await sql`
    ALTER TABLE reddit_seen_posts
    ADD COLUMN IF NOT EXISTS blog_generated_at TIMESTAMPTZ
  `
}

// ─── Reddit candidates ────────────────────────────────────────────────────────

async function getRedditCandidates(): Promise<TopicCandidate[]> {
  const rows = await sql`
    SELECT post_id, subreddit, post_title, post_url, post_body
    FROM reddit_seen_posts
    WHERE blog_generated_at IS NULL
      AND created_at >= NOW() - INTERVAL '14 days'
      AND LENGTH(COALESCE(post_body, '')) >= 100
    ORDER BY LENGTH(COALESCE(post_body, '')) DESC
    LIMIT 8
  `
  return rows.map((r: any) => ({
    id: r.post_id,
    source: 'reddit' as const,
    sourceLabel: `r/${r.subreddit}`,
    title: r.post_title,
    body: r.post_body ?? '',
    url: r.post_url,
  }))
}

// ─── Lightweight RSS parser (no dependencies) ─────────────────────────────────

interface RSSItem {
  title: string
  link: string
  description: string
  pubDate: string
}

function parseRSS(xml: string): RSSItem[] {
  const items: RSSItem[] = []
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  for (const b of blocks) {
    const c = b[1]
    const get = (tag: string) =>
      c.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`))?.[1]?.trim() ?? ''
    items.push({
      title: get('title'),
      link: get('link') || get('guid'),
      description: get('description'),
      pubDate: get('pubDate'),
    })
  }
  return items
}

function isRecentRSS(pubDate: string, maxDays = 7): boolean {
  if (!pubDate) return true // assume recent if no date
  try {
    const ms = Date.parse(pubDate)
    return !isNaN(ms) && (Date.now() - ms) < maxDays * 86_400_000
  } catch {
    return true
  }
}

// ─── News candidates via Google News RSS ─────────────────────────────────────

const NEWS_QUERIES = [
  'dubai real estate market',
  'dubai property investment 2025',
  'dubai rental yields',
  'DLD transactions Dubai',
]

// Reputable sources we want to surface (others still included if relevant)
const PREFERRED_SOURCES = [
  'khaleejtimes', 'gulfnews', 'arabianbusiness', 'thenationalnews',
  'zawya', 'propertyfinder', 'bayut', 'dubailand',
]

async function getNewsCandidates(): Promise<TopicCandidate[]> {
  const seen = new Set<string>()
  const candidates: TopicCandidate[] = []

  // Rotate queries — pick 2 per run to avoid hammering Google News
  const shuffled = [...NEWS_QUERIES].sort(() => 0.5 - Math.random()).slice(0, 2)

  for (const query of shuffled) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-AE&gl=AE&ceid=AE:en`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) continue
      const xml = await res.text()
      const items = parseRSS(xml)

      for (const item of items) {
        if (!item.title || seen.has(item.link)) continue
        if (!isRecentRSS(item.pubDate)) continue

        // Dedupe by link
        seen.add(item.link)

        // Determine source label from title (Google News format: "Headline - Source")
        const sourceMatch = item.title.match(/ - ([^-]+)$/)
        const sourceLabel = sourceMatch?.[1]?.trim() ?? 'News'
        const cleanTitle = sourceMatch ? item.title.replace(/ - [^-]+$/, '').trim() : item.title

        // Boost preferred sources to front; filter out low-signal items
        const isPreferred = PREFERRED_SOURCES.some(s =>
          sourceLabel.toLowerCase().includes(s) || item.link.toLowerCase().includes(s)
        )

        candidates.push({
          id: item.link,
          source: 'news' as const,
          sourceLabel,
          title: cleanTitle,
          body: item.description.replace(/<[^>]+>/g, '').slice(0, 600), // strip HTML
          url: item.link,
          // Temporarily tag preferred for sorting
          ...(isPreferred ? { _preferred: true } : {}),
        } as TopicCandidate & { _preferred?: boolean })
      }
    } catch (err) {
      console.warn(`[generate-blog-posts] News fetch failed for query "${query}":`, err)
    }

    await new Promise(r => setTimeout(r, 500))
  }

  // Sort: preferred sources first, then by recency
  return (candidates as Array<TopicCandidate & { _preferred?: boolean }>)
    .sort((a, b) => (b._preferred ? 1 : 0) - (a._preferred ? 1 : 0))
    .slice(0, 6)
    .map(({ _preferred: _p, ...c }) => c)
}

// ─── Live data insight from terminal ─────────────────────────────────────────

async function getDataInsight(): Promise<string> {
  try {
    const [topArea] = await sql`
      SELECT
        area_name_en,
        SUM(transaction_count)::integer AS vol,
        ROUND(AVG(avg_price_per_sqft)::numeric, 0) AS psf
      FROM mv_txn_monthly_unified
      WHERE year_month >= TO_CHAR(NOW() - INTERVAL '2 months', 'YYYY-MM')
        AND transaction_count > 0
        AND area_name_en IS NOT NULL
      GROUP BY area_name_en
      ORDER BY vol DESC
      LIMIT 1
    `
    const [momentum] = await sql`
      SELECT
        area_name_en,
        ROUND(
          ((MAX(CASE WHEN year_month >= TO_CHAR(NOW() - INTERVAL '2 months', 'YYYY-MM')
                     THEN avg_price_per_sqft END)
            - MAX(CASE WHEN year_month >= TO_CHAR(NOW() - INTERVAL '14 months', 'YYYY-MM')
                       AND year_month < TO_CHAR(NOW() - INTERVAL '2 months', 'YYYY-MM')
                       THEN avg_price_per_sqft END))
           / NULLIF(MAX(CASE WHEN year_month >= TO_CHAR(NOW() - INTERVAL '14 months', 'YYYY-MM')
                             AND year_month < TO_CHAR(NOW() - INTERVAL '2 months', 'YYYY-MM')
                             THEN avg_price_per_sqft END), 0) * 100)::numeric, 1
        ) AS yoy_pct
      FROM mv_txn_monthly_unified
      WHERE area_name_en IS NOT NULL
      GROUP BY area_name_en
      HAVING COUNT(DISTINCT year_month) >= 6
      ORDER BY yoy_pct DESC NULLS LAST
      LIMIT 1
    `

    const parts: string[] = []
    if (topArea?.area_name_en) {
      parts.push(
        `${topArea.area_name_en} led transaction volume over the past 2 months: ${Number(topArea.vol).toLocaleString()} transactions at AED ${Number(topArea.psf).toLocaleString()} avg PSF`
      )
    }
    if (momentum?.area_name_en && momentum.yoy_pct) {
      parts.push(
        `${momentum.area_name_en} had the strongest YoY PSF appreciation: +${momentum.yoy_pct}%`
      )
    }
    return parts.length > 0 ? `LIVE TERMINAL DATA (use selectively where relevant):\n${parts.join('\n')}` : ''
  } catch {
    return ''
  }
}

// ─── Build topic brief ────────────────────────────────────────────────────────

function buildTopicBrief(candidate: TopicCandidate, dataInsight: string): string {
  const sourceContext =
    candidate.source === 'reddit'
      ? `BLOG TOPIC SOURCE — Reddit ${candidate.sourceLabel}\nUser question: ${candidate.body.slice(0, 1000)}\n(Do NOT reference Reddit as a source. Use this as a signal for investor intent.)`
      : `BLOG TOPIC SOURCE — News article from ${candidate.sourceLabel}\nHeadline: ${candidate.title}\nSummary: ${candidate.body.slice(0, 800)}\nOriginal article: ${candidate.url}\n(You may reference the news event but ground the analysis in DLD/market data, not just the article.)`

  return [
    sourceContext,
    `Title/Topic: ${candidate.title}`,
    dataInsight,
    '',
    'INSTRUCTIONS: Write a full blog post for North Capital DXB based on this topic. Write for a Dubai property investor audience. Ground every claim in a specific number and time period. Include at least one contextual link to a relevant North Capital terminal page.',
  ]
    .filter(Boolean)
    .join('\n')
}

// ─── Gemini blog generation ───────────────────────────────────────────────────

async function generateBlog(topicBrief: string): Promise<any> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.7 },
  })
  const prompt = `${NORTH_CAPITAL_SYSTEM_PROMPT}\n\nSTRICT OUTPUT FORMAT:\n${BLOG_JSON_FORMAT_RULE}\n\n${topicBrief}`
  const result = await model.generateContent(prompt)
  const raw = result.response.text()
  return JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim())
}

// ─── Sanity draft creation ────────────────────────────────────────────────────

async function createSanityDraft(aiData: any): Promise<string> {
  const VALID_TYPES = ['INVESTMENT_ANALYSIS', 'MARKET_DATA', 'REGULATORY_NEWS', 'AREA_GUIDE', 'HOW_TO']
  const safeTitle = (aiData.title || 'Dubai Market Insight').toString().trim()
  const doc = {
    _type: 'post',
    _id: `drafts.auto-blog-${Date.now()}`,
    title: safeTitle,
    slug: { current: safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') },
    author: 'NorthCapital Research',
    excerpt: aiData.excerpt || '',
    keyTakeaways: aiData.keyTakeaways || [],
    faqs: aiData.faqs || [],
    body: aiData.bodyBlocks || [],
    publishedAt: new Date().toISOString(),
    ...(VALID_TYPES.includes(aiData.contentType) && { contentType: aiData.contentType }),
  }
  const created = await writeClient.create(doc)
  return created._id
}

// ─── Candidate selection ──────────────────────────────────────────────────────

function pickCandidates(reddit: TopicCandidate[], news: TopicCandidate[]): TopicCandidate[] {
  // Aim for 1 Reddit + 1 News if both available; fall back gracefully
  const picked: TopicCandidate[] = []
  if (reddit.length > 0) picked.push(reddit[0])
  if (news.length > 0) picked.push(news[0])
  // If only one source has items, fill from that source
  if (picked.length < 2 && reddit.length >= 2) picked.push(reddit[1])
  if (picked.length < 2 && news.length >= 2) picked.push(news[1])
  return picked.slice(0, 2)
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureColumn()

    const [redditCandidates, newsCandidates, dataInsight] = await Promise.all([
      getRedditCandidates(),
      getNewsCandidates(),
      getDataInsight(),
    ])

    const picked = pickCandidates(redditCandidates, newsCandidates)

    if (picked.length === 0) {
      return NextResponse.json({ success: true, generated: 0, message: 'No topic candidates found' })
    }

    let generated = 0
    for (const candidate of picked) {
      try {
        const brief = buildTopicBrief(candidate, dataInsight)
        const aiData = await generateBlog(brief)
        const draftId = await createSanityDraft(aiData)

        // Mark Reddit posts as used (news items don't need tracking)
        if (candidate.source === 'reddit') {
          await sql`
            UPDATE reddit_seen_posts
            SET blog_generated_at = NOW()
            WHERE post_id = ${candidate.id}
          `
        }

        const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
        const sanityUrl = `https://${projectId}.sanity.studio/desk/post;${draftId}`

        const sourceIcon = candidate.source === 'reddit' ? '🔴' : '📰'
        const tgMsg = [
          `📝 <b>Blog Draft Ready</b>`,
          `<b>${aiData.title}</b>`,
          `Type: ${aiData.contentType ?? 'UNKNOWN'}`,
          ``,
          `<i>${aiData.excerpt ?? ''}</i>`,
          ``,
          `<b>Key Takeaways:</b>`,
          ...(aiData.keyTakeaways ?? []).slice(0, 3).map((t: string) => `• ${t}`),
          ``,
          `${sourceIcon} <b>Source:</b> ${candidate.sourceLabel} — ${candidate.title}`,
          ``,
          `<a href="${sanityUrl}">Open in Sanity →</a>`,
        ].join('\n')

        await sendTelegramWithButtons(
          tgMsg,
          [[
            { text: '✅ Publish', callback_data: `publish:${draftId}` },
            { text: '❌ Skip', callback_data: `skip:${draftId}` },
          ]],
          process.env.TELEGRAM_THREAD_ID_BLOGS ?? process.env.TELEGRAM_THREAD_ID_ERRORS
        )
        generated++

        if (picked.indexOf(candidate) < picked.length - 1) {
          await new Promise(r => setTimeout(r, 3000))
        }
      } catch (err: any) {
        console.error(`[generate-blog-posts] Failed for "${candidate.title}":`, err)
        await sendTelegramError('/api/cron/generate-blog-posts', `Blog generation for "${candidate.title}"`, err)
      }
    }

    return NextResponse.json({
      success: true,
      generated,
      redditCandidates: redditCandidates.length,
      newsCandidates: newsCandidates.length,
    })
  } catch (err: any) {
    await sendTelegramError('/api/cron/generate-blog-posts', 'Cron top-level error', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
