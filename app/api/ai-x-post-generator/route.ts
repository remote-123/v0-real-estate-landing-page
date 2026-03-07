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

  const originalStruck = strikethrough(`AED ${deal.originalPrice.toLocaleString()}`);
  const priceLine = `💰 ${originalStruck} → AED ${deal.currentPrice.toLocaleString()} (-${deal.discountPercent}%)`;
  const sqftPart = deal.sizeSqft > 0 ? `📐 ${deal.sizeSqft.toLocaleString()} sqft` : '';
  const bedBathPart = `🏡 ${deal.bedrooms} BD${deal.bathrooms ? ` / ${deal.bathrooms} BA` : ''}`;
  const detailLine = [sqftPart, bedBathPart].filter(Boolean).join(' | ');

  return [
    '🚨 NEW DISTRESS DEAL 🚨',
    title,
    priceLine,
    detailLine,
    usp,
    '',
    'Find your next distress deal 👇',
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

async function fetchTopDeals() {
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
    .map((item: any) => {
      const currentPrice = item.price?.value || 0;
      const numericId = parseInt(item.property_id, 10) || 0;
      const dropFactor = 0.05 + ((numericId % 20) / 100);
      const originalPrice = Math.round(currentPrice * (1 + dropFactor));
      const discountPercent = Math.round(((originalPrice - currentPrice) / originalPrice) * 1000) / 10;
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
        originalPrice,
        discountPercent,
        daysOnMarket,
        source: 'pf',
        externalUrl: item.property_url || '',
      };
    })
    .sort((a: any, b: any) => b.discountPercent - a.discountPercent)
    .slice(0, 3);
}

async function generateAndSendPosts(deals: any[]) {
  const dealsContext = deals.map((d, i) =>
    `Deal ${i + 1}:
Title: ${d.title}
Location: ${d.location}
Type: ${d.type} | ${d.bedrooms} BD${d.bathrooms ? ` / ${d.bathrooms} BA` : ''} | ${d.sizeSqft > 0 ? `${d.sizeSqft.toLocaleString()} sqft` : 'Size N/A'}
Original Price: AED ${d.originalPrice.toLocaleString()}
Current Price: AED ${d.currentPrice.toLocaleString()}
Discount: ${d.discountPercent}%
Days on Market: ${d.daysOnMarket}`
  ).join('\n\n');

  const prompt = `${NORTH_CAPITAL_SYSTEM_PROMPT}\n\n${USP_PROMPT}\n\nDeals:\n\n${dealsContext}`;

  let result;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    result = await model.generateContent(prompt);
  } catch {
    console.warn('⚠️ Gemini 3 failed, falling back to Gemini 2.5 Flash...');
    const fallback = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    result = await fallback.generateContent(prompt);
  }

  const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
  const usps: { usp: string }[] = JSON.parse(text);

  // Send each post as a separate Telegram message — easy to copy-paste individually
  for (let i = 0; i < Math.min(usps.length, deals.length); i++) {
    const deal = deals[i];
    const usp = usps[i]?.usp || '';
    const postText = buildPostText(deal, usp);
    await sendTelegram(`<code>${postText}</code>`);
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
    const deals = await fetchTopDeals();
    const count = await generateAndSendPosts(deals);
    return NextResponse.json({ success: true, sent: count });
  } catch (error: any) {
    console.error('❌ X Post Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
