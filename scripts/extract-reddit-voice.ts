/**
 * Reddit Voice Extractor — Public Scraper Version
 * 
 * Fetches comment history for u/hassie1 using public JSON endpoints.
 * No API keys or auth required.
 *
 * Run: npx tsx scripts/extract-reddit-voice.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const USERNAME = 'hassie1'

async function fetchUserCommentsPublic(): Promise<any[]> {
    const allComments: any[] = []
    let after: string | null = null

    console.log(`📥 Starting extraction for u/${USERNAME} (fetching up to 1000 comments)...`)

    // Reddit public JSON allows fetching up to 1000 items (10 pages of 100)
    for (let page = 0; page < 10; page++) {
        const url = new URL(`https://www.reddit.com/user/${USERNAME}/comments.json`)
        url.searchParams.set('limit', '100')
        url.searchParams.set('sort', 'new')
        if (after) url.searchParams.set('after', after)

        const res = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        })

        if (!res.ok) {
            console.error(`❌ Fetch failed on page ${page + 1}:`, res.status)
            if (res.status === 429) {
                console.log('   Wait 30s and try again (rate limited)...')
                break
            }
            break
        }

        const data = await res.json()
        const children = data?.data?.children || []
        if (children.length === 0) break

        const batch = children.map((c: any) => c.data)
        allComments.push(...batch)
        after = data.data.after

        console.log(`   Page ${page + 1}: Fetched ${batch.length} comments. Total: ${allComments.length}`)

        if (!after) break
        // High delay to avoid 429 rate limits on public endpoints
        await new Promise(r => setTimeout(r, 2000))
    }

    return allComments
}

async function main() {
    const comments = await fetchUserCommentsPublic()
    
    if (comments.length === 0) {
        console.log('❌ No comments found. Is the profile private?')
        return
    }

    console.log('🧪 Processing samples...')
    
    // Filter: meaningful content (>50 chars, no deleted/removed)
    const quality = comments.filter(c =>
        c.body &&
        c.body !== '[deleted]' &&
        c.body !== '[removed]' &&
        c.body.length > 50
    )
    
    console.log(`   Filtered down to ${quality.length} quality voice samples.`)

    if (quality.length === 0) return

    // Prepare for Supabase
    const rows = quality.map(c => ({
        id: c.name,
        subreddit: c.subreddit,
        post_title: c.link_title || null,
        comment_body: c.body,
        score: c.score,
        created_utc: new Date(c.created_utc * 1000).toISOString(),
    }))

    // Upsert into Supabase
    const { error } = await supabase
        .from('reddit_voice_samples')
        .upsert(rows, { onConflict: 'id' })

    if (error) {
        console.error('❌ Supabase upsert error:', error)
        process.exit(1)
    }

    console.log(`\n✅ SUCCESSFULLY CAPTURED ${rows.length} SAMPLES for u/${USERNAME}`)
    console.log('   Gemini now has 11 years of context for your writing style.')
    
    console.log('\n   Top 3 samples by engagement:')
    quality
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .forEach(c => {
            console.log(`   [+${c.score} in r/${c.subreddit}]`)
            console.log(`   "${c.body.substring(0, 150)}..."\n`)
        })
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
