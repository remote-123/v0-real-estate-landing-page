import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiPrompt, BLOG_JSON_FORMAT_RULE } from '@/lib/ai-guidelines';
import { sendTelegramError } from '@/lib/telegram';
import { createClient } from 'next-sanity';

export const maxDuration = 300;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_BLOG_API_KEY!);

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-02-24",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});


export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.secret !== process.env.BLOG_GENERATOR_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let base64Pdf: string | null = null;
    if (body.pdfUrl) {
      const pdfResponse = await fetch(body.pdfUrl);
      if (pdfResponse.ok) {
        const pdfBuffer = await pdfResponse.arrayBuffer();
        base64Pdf = Buffer.from(pdfBuffer).toString('base64');
      }
    }

    const emailContext = { subject: body.subject?.slice(0, 100) ?? '(none)' };
    const prompt = getGeminiPrompt(BLOG_JSON_FORMAT_RULE);

    const promptParts: any[] = [
      prompt,
      `Email Subject: ${body.subject}\nEmail Body: ${body.body}`,
    ];
    if (base64Pdf) {
      promptParts.push({ inlineData: { data: base64Pdf, mimeType: 'application/pdf' } });
    }

    let responseText: string;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(promptParts);
      responseText = result.response.text();
    } catch (geminiError: any) {
      await sendTelegramError('/api/ai-blog-generator', 'Gemini 2.5 Flash generation failed', geminiError, emailContext);
      console.error('❌ Gemini failed:', geminiError);
      return NextResponse.json({ error: geminiError.message }, { status: 500 });
    }

    let aiData: any;
    try {
      const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      aiData = JSON.parse(jsonString);
    } catch (parseError: any) {
      await sendTelegramError('/api/ai-blog-generator', 'JSON parse of AI response', parseError, emailContext);
      console.error('❌ JSON parse failed:', parseError);
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 });
    }

    const safeTitle = (aiData.title || 'Untitled Market Insight').toString();

    const VALID_CONTENT_TYPES = ['INVESTMENT_ANALYSIS', 'MARKET_DATA', 'REGULATORY_NEWS', 'AREA_GUIDE', 'HOW_TO'];

    const doc = {
      _type: 'post',
      _id: `drafts.ai-blog-${Date.now()}`,
      title: safeTitle,
      slug: { current: safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') },
      author: 'NorthCapital Research',
      excerpt: aiData.excerpt || '',
      keyTakeaways: aiData.keyTakeaways || [],
      faqs: aiData.faqs || [],
      body: aiData.bodyBlocks || [],
      publishedAt: new Date().toISOString(),
      ...(VALID_CONTENT_TYPES.includes(aiData.contentType) && { contentType: aiData.contentType }),
    };

    let createdDoc: any;
    try {
      createdDoc = await writeClient.create(doc);
    } catch (sanityError: any) {
      await sendTelegramError('/api/ai-blog-generator', 'Sanity draft creation', sanityError, {
        ...emailContext,
        title: safeTitle.slice(0, 100),
      });
      console.error('❌ Sanity write failed:', sanityError);
      return NextResponse.json({ error: sanityError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, draftId: createdDoc._id });

  } catch (error: any) {
    await sendTelegramError('/api/ai-blog-generator', 'Unexpected error', error);
    console.error('❌ Blog Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
