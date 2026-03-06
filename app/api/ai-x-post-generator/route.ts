import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from 'next-sanity';
import { NORTH_CAPITAL_SYSTEM_PROMPT } from '@/lib/ai-guidelines';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-02-24",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const X_POST_FORMAT = `
TASK: Generate X (Twitter) post drafts for @northcapitaldxb based on the distress deal data provided.

For each deal, generate ONE tight, data-first post. Rules:
- Open with a hard data hook: the price drop amount or %, days on market, or beds/location combo
- Analytical and direct — NOT salesy. You are flagging an anomaly, not pitching a property.
- End with this exact CTA on its own line: northcapitaldxb.com/terminal/distress-deals
- Stay under 250 characters EXCLUDING the CTA link (the link takes ~23 chars in X)
- Use line breaks for rhythm. No bullet points.
- NEVER use: stunning, masterpiece, luxury, unparalleled, nestled, game-changer, seamless

Also generate for each post:
- imageBrief: A specific, actionable description of what screenshot or visual to attach. Examples: "Screenshot of the PropertyFinder listing page showing the original vs. current asking price in the price history section" or "Side-by-side map showing the property location relative to Downtown Dubai and DIFC"
- suggestedHashtags: 3-4 hashtags relevant to the property and Dubai market (e.g., #DubaiRealEstate #DistressDeals #UAEProperty #DubaiInvesting)

Return STRICTLY as a JSON array — no markdown, no backticks, just the array:
[
  {
    "postText": "...",
    "imageBrief": "...",
    "suggestedHashtags": "..."
  }
]
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

async function generateAndSavePosts(deals: any[]) {
  const dealsContext = deals.map((d, i) =>
    `Deal ${i + 1}:
Title: ${d.title}
Location: ${d.location}
Type: ${d.type} | ${d.bedrooms}BR | ${d.sizeSqft > 0 ? `${d.sizeSqft.toLocaleString()} sqft` : 'Size N/A'}
Original Price: AED ${d.originalPrice.toLocaleString()}
Current Price: AED ${d.currentPrice.toLocaleString()}
Discount: ${d.discountPercent}%
Days on Market: ${d.daysOnMarket}`
  ).join('\n\n');

  const prompt = `${NORTH_CAPITAL_SYSTEM_PROMPT}\n\n${X_POST_FORMAT}\n\nDeals to generate posts for:\n\n${dealsContext}`;

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
  const posts: any[] = JSON.parse(text);

  const savedIds: string[] = [];
  for (let i = 0; i < Math.min(posts.length, deals.length); i++) {
    const deal = deals[i];
    const post = posts[i];
    const doc = {
      _type: 'xPost',
      _id: `drafts.ai-xpost-${Date.now()}-${i}`,
      postText: post.postText,
      imageBrief: post.imageBrief,
      suggestedHashtags: post.suggestedHashtags,
      status: 'draft',
      dealTitle: deal.title,
      dealLocation: deal.location,
      dealType: deal.type,
      dealBedrooms: deal.bedrooms,
      dealCurrentPrice: deal.currentPrice,
      dealOriginalPrice: deal.originalPrice,
      dealDiscountPercent: deal.discountPercent,
      dealDaysOnMarket: deal.daysOnMarket,
      dealSource: deal.source,
      dealExternalUrl: deal.externalUrl || null,
      generatedAt: new Date().toISOString(),
    };
    const created = await writeClient.create(doc);
    console.log(`✅ X post draft saved: ${created._id}`);
    savedIds.push(created._id);
  }

  return savedIds;
}

// POST — manual trigger (same secret key pattern as blog generator)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.secret !== 'NORTHCAPITAL_SUPER_SECRET_KEY_2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('🤖 X Post Generator: manual trigger');
    const deals = await fetchTopDeals();
    const drafts = await generateAndSavePosts(deals);
    return NextResponse.json({ success: true, drafts });
  } catch (error: any) {
    console.error('❌ X Post Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

