import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NORTH_CAPITAL_SYSTEM_PROMPT } from '@/lib/ai-guidelines';
import { sendTelegram } from '@/lib/telegram';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_DISTRESS_API_KEY!);

function buildPostText(deal: any, usp: string): string {
  const title = deal.title.length > 45
    ? deal.title.substring(0, 42) + '...'
    : deal.title;

  const priceLine = `💰 AED ${deal.currentPrice.toLocaleString()}`;
  const sqftPart = deal.sizeSqft > 0 ? `📐 ${deal.sizeSqft.toLocaleString()} sqft` : '';
  const psfPart = deal.pricePerSqft > 0 ? `AED ${deal.pricePerSqft.toLocaleString()}/sqft` : '';
  const bedBathPart = `🏡 ${deal.bedrooms} BD${deal.bathrooms ? ` / ${deal.bathrooms} BA` : ''}`;
  const domPart = `⏳ ${deal.daysOnMarket}d on market`;
  const detailLine = [sqftPart, psfPart, bedBathPart, domPart].filter(Boolean).join(' | ');

  return [
    '🚨 NEW DISTRESS DEAL 🚨',
    title,
    `📍 ${deal.location}`,
    priceLine,
    detailLine,
    usp,
    '',
    'Find your next distress deal 👇 (via PropertyFinder)',
    'northcapitaldxb.com/terminal/distress-deals',
  ].join('\n');
}

const USP_PROMPT = `
TASK: For each Dubai real estate distress deal provided, write ONE punchy analytical USP sentence (max 100 characters).

The USP must include:
1. The area/community name
2. In brackets: [Avg: AED X/sqft | Listing: AED Y/sqft] using the listing's price/sqft provided and your knowledge of the community's average resale price/sqft

Example format: "JVC trades at AED 1,100/sqft avg — this lists at [Avg: AED 1,100/sqft | Listing: AED 920/sqft]"

Focus the analytical angle on ONE of:
- Price-per-sqft anomaly vs. community average (use the bracket format above)
- Location scarcity or demand strength with the price context
- Yield potential given the psf discount

Rules:
- Specific and data-informed — use real Dubai community psf benchmarks from your knowledge
- Active voice, confident tone
- NEVER use: stunning, luxury, masterpiece, unparalleled, nestled, game-changer, seamless, rapidly
- No exclamation marks

Return STRICTLY as a JSON array — no markdown, no backticks:
[{"usp": "..."}]
`;

async function fetchPropertyFinderDeals() {
  const url = 'https://propertyfinder-uae-data.p.rapidapi.com/search-buy?location_id=1&sort=newest&page=1&is_new_construction=false';
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'propertyfinder-uae-data.p.rapidapi.com',
      'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
    },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Failed to fetch PropertyFinder data');

  const data = await res.json();
  const rawData = Array.isArray(data?.data) ? data.data : [];

  return rawData
    .filter((item: any) => item && item.property_id && (item.price?.value || 0) > 0)
    .filter((item: any) => !item.is_direct_from_developer)
    .map((item: any) => {
      const currentPrice = item.price?.value || 0;
      const sizeSqft = Math.round(item.size?.value || 0);
      const pricePerSqft = sizeSqft > 0 ? Math.round(currentPrice / sizeSqft) : 0;
      const createdDate = new Date(item.listed_date || Date.now());
      const daysOnMarket = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 3600 * 24)));

      return {
        id: item.property_id.toString(),
        title: item.title || '',
        location: item.address?.full_name || 'Dubai',
        type: item.property_type?.toUpperCase() || 'PROPERTY',
        bedrooms: item.bedrooms?.toString() || 'Studio',
        bathrooms: item.bathrooms?.toString() || null,
        sizeSqft,
        pricePerSqft,
        currentPrice,
        daysOnMarket,
        externalUrl: item.property_url || '',
        images: Array.isArray(item.images) ? item.images.slice(0, 3) : [],
      };
    })
    .sort((a: any, b: any) => b.daysOnMarket - a.daysOnMarket)
    .slice(0, 3);
}

async function generateAndSendPosts(deals: any[]) {
  const dealsContext = deals.map((d, i) =>
    `Deal ${i + 1}:
Title: ${d.title}
Location: ${d.location}
Type: ${d.type} | ${d.bedrooms} BD${d.bathrooms ? ` / ${d.bathrooms} BA` : ''} | ${d.sizeSqft > 0 ? `${d.sizeSqft.toLocaleString()} sqft` : 'Size N/A'}
Price: AED ${d.currentPrice.toLocaleString()}${d.pricePerSqft > 0 ? ` (AED ${d.pricePerSqft.toLocaleString()}/sqft)` : ''}
Days on Market: ${d.daysOnMarket}`
  ).join('\n\n');

  const prompt = `${NORTH_CAPITAL_SYSTEM_PROMPT}\n\n${USP_PROMPT}\n\nDeals:\n\n${dealsContext}`;

  let result;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    result = await model.generateContent(prompt);
  } catch {
    console.warn('⚠️ Gemini 2.5 Flash failed, falling back to gemini-1.5-flash...');
    const fallback = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    result = await fallback.generateContent(prompt);
  }

  const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
  const usps: { usp: string }[] = JSON.parse(text);

  for (let i = 0; i < Math.min(usps.length, deals.length); i++) {
    const deal = deals[i];
    const usp = usps[i]?.usp || '';
    const postText = buildPostText(deal, usp);
    const sourceLine = deal.externalUrl ? `\n\n🔗 PropertyFinder listing:\n${deal.externalUrl}` : '';
    const imagesLine = deal.images?.length > 0
      ? `\n\n📸 Photos:\n${deal.images.join('\n')}`
      : '';
    await sendTelegram(`<code>${postText}</code>${sourceLine}${imagesLine}`);
  }

  return deals.length;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deals = await fetchPropertyFinderDeals().catch(err => {
      console.error('PropertyFinder fetch failed:', err);
      return [];
    });

    if (deals.length === 0) {
      return NextResponse.json({ error: 'No deals fetched from PropertyFinder' }, { status: 500 });
    }

    const count = await generateAndSendPosts(deals);
    return NextResponse.json({ success: true, sent: count });
  } catch (error: any) {
    console.error('❌ Distress X Post Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
