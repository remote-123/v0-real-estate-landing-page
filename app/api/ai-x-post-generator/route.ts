import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NORTH_CAPITAL_SYSTEM_PROMPT } from '@/lib/ai-guidelines';
import { sendTelegram } from '@/lib/telegram';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Applies Unicode strikethrough — renders natively on X/Twitter
function strikethrough(text: string): string {
  return text.split('').map(c => c + '\u0336').join('');
}

function buildPostText(deal: any, usp: string): string {
  const title = deal.title.length > 45
    ? deal.title.substring(0, 42) + '...'
    : deal.title;

  const priceLine = `💰 AED ${deal.currentPrice.toLocaleString()}`;
  const sqftPart = deal.sizeSqft > 0 ? `📐 ${deal.sizeSqft.toLocaleString()} sqft` : '';
  const bedBathPart = `🏡 ${deal.bedrooms} BD${deal.bathrooms ? ` / ${deal.bathrooms} BA` : ''}`;
  const domPart = `⏳ ${deal.daysOnMarket}d on market`;
  const detailLine = [sqftPart, bedBathPart, domPart].filter(Boolean).join(' | ');
  const sourceLine = deal.source === 'bayut' ? 'via Bayut' : 'via PropertyFinder';

  return [
    '🚨 NEW DISTRESS DEAL 🚨',
    title,
    priceLine,
    detailLine,
    usp,
    '',
    `Find your next distress deal 👇 (${sourceLine})`,
    'northcapitaldxb.com/terminal/distress-deals',
  ].join('\n');
}

const USP_PROMPT = `
TASK: For each Dubai real estate distress deal provided, write ONE punchy analytical USP sentence (max 85 characters).

The USP should explain WHY this specific deal is worth flagging to a HNW investor. Focus on ONE of:
- Location scarcity or demand strength (e.g. "JBR vacancy sits under 8% — absorption here is consistent")
- Price-per-sqft anomaly vs. community average
- Yield potential given the discount
- Market timing or supply context

Rules:
- Specific and data-informed — no generic claims
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
      const createdDate = new Date(item.listed_date || Date.now());
      const daysOnMarket = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 3600 * 24)));

      return {
        id: item.property_id.toString(),
        title: item.title || '',
        location: item.address?.full_name || 'Dubai',
        type: item.property_type?.toUpperCase() || 'PROPERTY',
        bedrooms: item.bedrooms?.toString() || 'Studio',
        bathrooms: item.bathrooms?.toString() || null,
        sizeSqft: Math.round(item.size?.value || 0),
        currentPrice,
        daysOnMarket,
        source: 'pf',
        externalUrl: item.property_url || '',
        images: Array.isArray(item.images) ? item.images.slice(0, 3) : [],
      };
    })
    .sort((a: any, b: any) => b.daysOnMarket - a.daysOnMarket)
    .slice(0, 3);
}

async function fetchBayutDeals() {
  const url = 'https://uae-real-estate2.p.rapidapi.com/properties_search?page=0&langs=en';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': 'uae-real-estate2.p.rapidapi.com',
      'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
    },
    body: JSON.stringify({
      purpose: 'for-sale',
      categories: ['apartments', 'villas', 'penthouses', 'townhouses'],
      price_min: 1000000,
      price_max: 50000000,
      sale_type: 'resale',
      is_completed: true,
      index: 'date-desc',
    }),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Failed to fetch Bayut data');

  const data = await res.json();
  const rawData = Array.isArray(data?.results) ? data.results : [];

  return rawData
    .filter((item: any) => item && item.id && item.price > 0)
    .map((item: any) => {
      const currentPrice = item.price;
      const createdDate = new Date(item.meta?.created_at || Date.now());
      const daysOnMarket = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 3600 * 24)));

      return {
        id: item.id.toString(),
        title: item.title || '',
        location: `${item.location?.sub_community?.name || ''}, ${item.location?.community?.name || ''}`.replace(/^, /, '') || 'Dubai',
        type: item.type?.sub?.toUpperCase() || 'PROPERTY',
        bedrooms: item.details?.bedrooms?.toString() || 'Studio',
        bathrooms: null,
        sizeSqft: Math.round(item.area?.built_up || 0),
        currentPrice,
        daysOnMarket,
        source: 'bayut',
        externalUrl: item.meta?.url || '',
        images: Array.isArray(item.photos) ? item.photos.slice(0, 3).map((p: any) => p.url || p) : [],
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
Price: AED ${d.currentPrice.toLocaleString()}
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

  // Send each post as a separate Telegram message — easy to copy-paste individually
  for (let i = 0; i < Math.min(usps.length, deals.length); i++) {
    const deal = deals[i];
    const usp = usps[i]?.usp || '';
    const postText = buildPostText(deal, usp);
    const sourceLabel = deal.source === 'bayut' ? '🔗 Bayut listing' : '🔗 PropertyFinder listing';
    const sourceLine = deal.externalUrl ? `\n\n${sourceLabel}:\n${deal.externalUrl}` : '';
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
    if (body.secret !== 'NORTHCAPITAL_SUPER_SECRET_KEY_2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('🤖 X Post Generator: manual trigger');

    const [pfDeals, bayutDeals] = await Promise.all([
      fetchPropertyFinderDeals().catch(err => {
        console.error('PropertyFinder fetch failed:', err);
        return [];
      }),
      fetchBayutDeals().catch(err => {
        console.error('Bayut fetch failed:', err);
        return [];
      }),
    ]);

    const deals = [...pfDeals, ...bayutDeals];
    if (deals.length === 0) {
      return NextResponse.json({ error: 'No deals fetched from either source' }, { status: 500 });
    }

    const count = await generateAndSendPosts(deals);
    return NextResponse.json({ success: true, sent: count, pf: pfDeals.length, bayut: bayutDeals.length });
  } catch (error: any) {
    console.error('❌ X Post Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
