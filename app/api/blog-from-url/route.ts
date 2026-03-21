import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getGeminiPrompt } from '@/lib/ai-guidelines'
import { sendTelegramError } from '@/lib/telegram'
import { createClient } from 'next-sanity'

export const maxDuration = 120

const genAI = new GoogleGenerativeAI(process.env.GEMINI_BLOG_API_KEY!)

const writeClient = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: '2024-02-24',
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
})

const jsonFormatRule = `
You MUST output strictly as a JSON object matching this exact structure:
{
  "title": "Specific, data-led title — include a number or location where possible. No vague superlatives.",
  "excerpt": "A sharp 150-character summary that states the investment implication directly.",
  "keyTakeaways": ["Specific fact with a number", "Specific fact with a number", "Specific fact with a number", "Specific fact with a number"],
  "faqs": [
    {"question": "Phrase exactly as an investor would type into Google", "answer": "2-3 sentence direct answer with specific data."}
  ],
  "bodyBlocks": [
    {
      "_type": "block",
      "style": "h2",
      "children": [{"_type": "span", "text": "Your heading text"}]
    },
    {
      "_type": "block",
      "style": "normal",
      "children": [{"_type": "span", "text": "Your paragraph text."}]
    }
  ]
}

WRITING RULES — READ CAREFULLY:
- Minimum 600 words in bodyBlocks. Use H2s to break sections.
- Every claim must be specific. "Yields are high" is banned. "Net yields in JVC averaged 7.8% in Q1 2025" is correct.
- Vary sentence length deliberately. Mix one-word punches with longer analytical sentences. Never 3 sentences in a row of the same length.
- BANNED AI PHRASES (using any of these will make the post useless): "In today's fast-paced world", "It's worth noting", "Furthermore", "Moreover", "It goes without saying", "In the realm of", "In conclusion", "Navigating", "Landscape", "Underpins", "Poised to", "Testament to", "Leveraging", "At the end of the day", "Deep dive", "Robust", "Paradigm shift", "Synergy", "Holistic".
- Write with a clear point of view. Not neutral. Not "on one hand / on the other hand". Take a position backed by data.
- Use short paragraphs. 3-4 sentences max per paragraph block. White space is your friend.
- The first sentence of the post must hook the reader with a specific number, a counterintuitive claim, or a market observation — not a generic context-setter.
- Include at least one "Bear Case" section: who should NOT make this investment and why. This is what makes the content trustworthy.

CRITICAL DATA RULE:
If the source material contains tables or heavy numerical data, DO NOT attempt to create a table. Synthesize into analytical prose with specific numbers embedded naturally.
`

function extractTextFromHtml(html: string): string {
    // Remove script/style blocks
    let text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    // Strip remaining tags
    text = text.replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
    // Collapse whitespace
    text = text.replace(/\s+/g, ' ').trim()
    return text
}

function extractTitle(html: string): string {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    return match?.[1]?.trim() ?? 'Article'
}

async function fetchArticle(url: string): Promise<{ title: string; body: string }> {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
        },
    })
    if (!res.ok) throw new Error(`Failed to fetch URL: HTTP ${res.status}`)
    const html = await res.text()
    const title = extractTitle(html)
    const body = extractTextFromHtml(html).slice(0, 8000) // cap at ~8k chars for Gemini
    return { title, body }
}

export async function POST(req: Request) {
    try {
        // Auth: accept cookie (admin UI) or BLOG_GENERATOR_SECRET (Telegram webhook / programmatic)
        const cookieStore = await cookies()
        const cookieAuth = cookieStore.get('admin_auth')?.value
        const body = await req.json()

        const isAdminCookie = cookieAuth && cookieAuth === process.env.ADMIN_PASSCODE
        const isSecretAuth = body.secret && body.secret === process.env.BLOG_GENERATOR_SECRET

        if (!isAdminCookie && !isSecretAuth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const url: string = body.url
        if (!url || !url.startsWith('http')) {
            return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
        }

        // Fetch article
        let article: { title: string; body: string }
        try {
            article = await fetchArticle(url)
        } catch (fetchErr: any) {
            return NextResponse.json({ error: `Could not fetch URL: ${fetchErr.message}` }, { status: 422 })
        }

        if (article.body.length < 200) {
            return NextResponse.json({ error: 'Page has too little readable text to generate a blog post.' }, { status: 422 })
        }

        const prompt = getGeminiPrompt(jsonFormatRule)
        const promptParts = [
            prompt,
            `Source URL: ${url}\nArticle Title: ${article.title}\nArticle Content:\n${article.body}`,
        ]

        let responseText: string
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
            const result = await model.generateContent(promptParts)
            responseText = result.response.text()
        } catch (geminiError: any) {
            await sendTelegramError('/api/blog-from-url', 'Gemini generation failed', geminiError, { url })
            return NextResponse.json({ error: geminiError.message }, { status: 500 })
        }

        let aiData: any
        try {
            const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim()
            aiData = JSON.parse(jsonString)
        } catch (parseError: any) {
            await sendTelegramError('/api/blog-from-url', 'JSON parse of AI response', parseError, { url })
            return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 })
        }

        const safeTitle = (aiData.title || article.title).toString()

        const doc = {
            _type: 'post',
            _id: `drafts.ai-blog-url-${Date.now()}`,
            title: safeTitle,
            slug: { current: safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') },
            author: 'NorthCapital Research',
            excerpt: aiData.excerpt || '',
            keyTakeaways: aiData.keyTakeaways || [],
            faqs: aiData.faqs || [],
            body: aiData.bodyBlocks || [],
            publishedAt: new Date().toISOString(),
            sourceUrl: url,
        }

        let createdDoc: any
        try {
            createdDoc = await writeClient.create(doc)
        } catch (sanityError: any) {
            await sendTelegramError('/api/blog-from-url', 'Sanity draft creation', sanityError, { url, title: safeTitle.slice(0, 100) })
            return NextResponse.json({ error: sanityError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, draftId: createdDoc._id, title: safeTitle })

    } catch (error: any) {
        await sendTelegramError('/api/blog-from-url', 'Unexpected error', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
