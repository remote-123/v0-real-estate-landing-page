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
    let result;

    try {
      // 5A. TRY THE PRIMARY MODEL
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      result = await model.generateContent(promptParts);
    } catch (primaryError: any) {
      console.warn(`⚠️ Gemini 3 failed (${primaryError.message}). Falling back to Gemini 2.5 Flash...`);

      // 5B. FALLBACK MODEL
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      result = await fallbackModel.generateContent(promptParts);
    }

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
      author: 'NorthCapital Research',
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