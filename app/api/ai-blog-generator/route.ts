import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from 'next-sanity';
import { getGeminiPrompt } from '@/lib/ai-guidelines';

export const maxDuration = 60; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-02-24", 
  useCdn: false,
  token: process.env.SANITY_API_TOKEN, 
});

const jsonFormatRule = `
You MUST output strictly as a JSON object matching this exact structure:
{
  "title": "Catchy, SEO-optimized title without marketing hyperbole",
  "excerpt": "A compelling 150-character meta description.",
  "keyTakeaways": ["Fact 1", "Fact 2", "Fact 3", "Fact 4"],
  "faqs": [
    {"question": "...", "answer": "..."}
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
Make the bodyBlocks at least 400 words. Include H2s and normal paragraphs.

CRITICAL DATA RULE: 
If the source material contains tables or heavy numerical data, DO NOT attempt to create a table. Instead, synthesize that data into highly readable, analytical bullet points within normal paragraphs.
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.secret !== "NORTHCAPITAL_SUPER_SECRET_KEY_2026") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🤖 Processing AI Blog for: ${body.subject}`);

    // OPTIONAL PDF DOWNLOAD
    let base64Pdf = null;
    if (body.pdfUrl) {
      console.log("📥 Downloading attached PDF...");
      const pdfResponse = await fetch(body.pdfUrl);
      if (pdfResponse.ok) {
        const pdfBuffer = await pdfResponse.arrayBuffer();
        base64Pdf = Buffer.from(pdfBuffer).toString('base64');
      }
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = getGeminiPrompt(jsonFormatRule);

    // Build the payload dynamically
    const promptParts: any[] = [
      prompt,
      `Email Subject: ${body.subject}\nEmail Body: ${body.body}`
    ];

    if (base64Pdf) {
      promptParts.push({
        inlineData: { data: base64Pdf, mimeType: "application/pdf" }
      });
    }

    console.log("🧠 Sending data to Gemini...");
    const result = await model.generateContent(promptParts);

    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const aiData = JSON.parse(jsonString);

    console.log("💾 Saving Draft to Sanity...");
    
    // Safety check: ensure title is a string so .toLowerCase() doesn't crash
    const safeTitle = (aiData.title || "Untitled Market Insight").toString();

    const doc = {
      _type: 'post',
      _id: `drafts.ai-blog-${Date.now()}`,
      title: safeTitle,
      slug: { current: safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') },
      author: 'NorthCapital AI',
      excerpt: aiData.excerpt || "",
      keyTakeaways: aiData.keyTakeaways || [],
      faqs: aiData.faqs || [],
      body: aiData.bodyBlocks || [],
      publishedAt: new Date().toISOString()
    };


    const createdDoc = await writeClient.create(doc);
    console.log(`✅ Success! Draft created: ${createdDoc._id}`);

    return NextResponse.json({ success: true, draftId: createdDoc._id });

  } catch (error: any) {
    console.error('❌ Blog Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}