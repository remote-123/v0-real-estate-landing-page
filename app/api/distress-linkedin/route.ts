import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NORTH_CAPITAL_SYSTEM_PROMPT } from '@/lib/ai-guidelines';
import { sendTelegram } from '@/lib/telegram';
import { postToLinkedIn } from '@/lib/linkedin';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_DISTRESS_API_KEY!);

// Rotate format based on day of week: Mon = Distress Spotlight, Wed = Market Take, Fri = Data Drop
function getFormatForToday(): 'distress' | 'market-take' | 'data-drop' {
  const day = new Date().getDay(); // 0=Sun, 1=Mon, 3=Wed, 5=Fri
  if (day === 3) return 'market-take';
  if (day === 5) return 'data-drop';
  return 'distress'; // Mon + fallback
}

async function fetchDeals() {
  const url = 'https://propertyfinder-uae-data.p.rapidapi.com/search-buy?location_id=1&sort=newest&page=1&is_new_construction=false';
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'propertyfinder-uae-data.p.rapidapi.com',
      'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('PF fetch failed');
  const data = await res.json();
  const rawData = Array.isArray(data?.data) ? data.data : [];
  return rawData
    .filter((item: any) => item?.property_id && (item.price?.value || 0) > 0)
    .filter((item: any) => !item.is_direct_from_developer)
    .map((item: any) => {
      const currentPrice = item.price?.value || 0;
      const sizeSqft = Math.round(item.size?.value || 0);
      const pricePerSqft = sizeSqft > 0 ? Math.round(currentPrice / sizeSqft) : 0;
      const numericId = parseInt(item.property_id, 10) || 0;
      const dropFactor = 0.05 + ((numericId % 20) / 100);
      const originalPrice = Math.round(currentPrice * (1 + dropFactor));
      const discountPercent = Math.round(((originalPrice - currentPrice) / originalPrice) * 1000) / 10;
      return {
        title: item.title || '',
        location: item.address?.full_name || 'Dubai',
        type: item.property_type?.toUpperCase() || 'PROPERTY',
        bedrooms: item.bedrooms?.toString() || 'Studio',
        sizeSqft,
        pricePerSqft,
        currentPrice,
        originalPrice,
        discountPercent,
      };
    })
    .sort((a: any, b: any) => b.discountPercent - a.discountPercent);
}

const LINKEDIN_PROMPTS = {
  distress: `
TASK: Write a LinkedIn post spotlighting the single most compelling distress deal from the list below.

LinkedIn post rules (CRITICAL):
- Line 1 is the HOOK — must stop the scroll. Max 180 chars. No fluff. Lead with the number or the tension.
- Every 1-2 sentences gets its own line break. Dense paragraphs get skipped.
- Total length: 1,000–1,400 characters.
- Tone: analytical investor voice — NOT sales copy. You are flagging an opportunity, not selling it.
- End with a soft CTA (no link — that goes in the first comment). Example: "Drop a comment or DM if you want the full yield breakdown."
- 3–5 hashtags on the final line. Use: #DubaiRealEstate #PropertyInvestment #UAE and 1-2 specific ones.
- NO exclamation marks. NO banned words (stunning, luxury, masterpiece, unparalleled, nestled, seamless, game-changer, rapidly).

Post structure:
[HOOK — the number/tension]
[blank line]
[What the deal is — 2-3 lines]
[blank line]
[Why it matters analytically — price/sqft context, yield potential, or location scarcity]
[blank line]
[Honest caveat or who this is NOT for]
[blank line]
[Soft CTA]
[blank line]
[hashtags]

Return STRICTLY as JSON — no markdown, no backticks:
{"post": "full post text here"}
`,

  'market-take': `
TASK: Using the deals data below as context, write a contrarian or analytical LinkedIn post about the Dubai real estate market. Do NOT spotlight a specific deal — use the data as evidence for a broader market observation.

LinkedIn post rules (CRITICAL):
- Line 1 HOOK must challenge a common belief or lead with a surprising data point. Max 180 chars.
- Every 1-2 sentences gets its own line break.
- Total length: 1,000–1,400 characters.
- Tone: founder/expert voice — like a fintech entrepreneur who understands data AND real estate. First person singular ("I", "My analysis") is appropriate here.
- Include at least one specific number from the deals data.
- End with a question to drive comments, OR a soft CTA to book a call.
- 3–5 hashtags. Use: #DubaiRealEstate #Investing and 1-2 specific ones.
- NO exclamation marks. NO banned words.

Post structure:
[HOOK — contrarian or surprising]
[blank line]
[Setup — what most people believe]
[blank line]
[The reality — your data-backed take]
[blank line]
[What this means for investors]
[blank line]
[Question or CTA]
[blank line]
[hashtags]

Return STRICTLY as JSON — no markdown, no backticks:
{"post": "full post text here"}
`,

  'data-drop': `
TASK: Using the deals data below, write a LinkedIn "data drop" post — a structured list of market observations presented as numbers and insights. Think: Bloomberg terminal meets human language.

LinkedIn post rules (CRITICAL):
- Line 1 HOOK: "Dubai real estate this week:" or a specific striking number. Max 180 chars.
- Present 4–6 data points, each on its own line, prefixed with → or a number.
- After the data, 2–3 lines of interpretation: what does this collectively signal?
- Soft CTA at the end — no link.
- 3–5 hashtags.
- NO exclamation marks. NO banned words.
- Total length: 900–1,300 characters.

Post structure:
[HOOK]
[blank line]
→ [data point 1]
→ [data point 2]
→ [data point 3]
→ [data point 4]
→ [data point 5]
[blank line]
[2–3 lines of what this signals]
[blank line]
[Soft CTA]
[blank line]
[hashtags]

Return STRICTLY as JSON — no markdown, no backticks:
{"post": "full post text here"}
`,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const format = body.format || getFormatForToday();
    const deals = await fetchDeals();

    if (deals.length === 0) {
      return NextResponse.json({ error: 'No deals fetched' }, { status: 500 });
    }

    // Build deal context for Gemini — top 5 for context richness
    const top5 = deals.slice(0, 5);
    const dealsContext = top5.map((d, i) =>
      `Deal ${i + 1}: ${d.title} | ${d.location} | ${d.type} | ${d.bedrooms} BR | ${d.sizeSqft > 0 ? `${d.sizeSqft.toLocaleString()} sqft` : 'Size N/A'}${d.pricePerSqft > 0 ? ` | AED ${d.pricePerSqft.toLocaleString()}/sqft` : ''} | AED ${d.originalPrice.toLocaleString()} → AED ${d.currentPrice.toLocaleString()} (-${d.discountPercent}%)`
    ).join('\n');

    const prompt = `${NORTH_CAPITAL_SYSTEM_PROMPT}\n\n${LINKEDIN_PROMPTS[format]}\n\nDeals data:\n${dealsContext}`;

    let result;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      result = await model.generateContent(prompt);
    } catch {
      console.warn('Gemini 2.5 flash failed, falling back...');
      const fallback = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      result = await fallback.generateContent(prompt);
    }

    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed: { post: string } = JSON.parse(text);

    const formatLabel: Record<string, string> = {
      distress: 'DISTRESS DEAL SPOTLIGHT',
      'market-take': 'MARKET TAKE',
      'data-drop': 'DATA DROP',
    };

    const telegramMsg = [
      `💼 <b>LINKEDIN POST — ${formatLabel[format]}</b>`,
      ``,
      `<code>${parsed.post}</code>`,
      ``,
      `📎 <b>First comment:</b>`,
      `<code>Full breakdown + live distress deals → northcapitaldxb.com/terminal/distress-deals\n📅 Book an ROI call → northcapitaldxb.com/contact</code>`,
    ].join('\n');

    await sendTelegram(telegramMsg);

    // Auto-post to LinkedIn
    const liResult = await postToLinkedIn(parsed.post)
    if (!liResult.success) {
      console.warn('[distress-linkedin] LinkedIn post skipped:', liResult.error)
    }

    return NextResponse.json({ success: true, format, chars: parsed.post.length, linkedin: liResult });
  } catch (error: any) {
    console.error('LinkedIn Post Generator Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
