import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { client } from '@/sanity/lib/client';
import { getGeminiPrompt } from '@/lib/ai-guidelines';

// If you are on Vercel Pro, this allows the AI up to 60 seconds to read the PDF and write the blog.
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. SECURITY CHECK
    if (body.secret !== "NORTHCAPITAL_SUPER_SECRET_KEY_2026") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🤖 Processing AI Blog for: ${body.subject}`);

    // 2. DOWNLOAD THE PDF FROM GOOGLE DRIVE
    const pdfResponse = await fetch(body.pdfUrl);
    if (!pdfResponse.ok) throw new Error("Failed to download PDF from Drive");
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

    // 3. WAKE UP GEMINI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview", // Pro model handles massive PDFs better
      generationConfig: { responseMimeType: "application/json" } // Force strict JSON
    });

    const jsonFormatRule = `
      
      You MUST output strictly as a JSON object matching this exact structure:
      {
        "title": "Catchy, SEO-optimized title including the property and developer name",
        "excerpt": "A compelling 150-character meta description.",
        "keyTakeaways": ["Fact 1", "Fact 2", "Fact 3", "Fact 4"],
        "faqs": [
          {"question": "What is the payment plan for...?", "answer": "..."}
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
    `;

    const prompt = getGeminiPrompt(jsonFormatRule);

    // 4. GENERATE THE CONTENT
    console.log("🧠 Sending PDF to Gemini...");
    const result = await model.generateContent([
      prompt,
      `Email Subject: ${body.subject}\nEmail Body: ${body.body}`,
      {
        inlineData: {
          data: base64Pdf,
          mimeType: "application/pdf"
        }
      }
    ]);

    const aiData = JSON.parse(result.response.text());

    // 5. PUSH TO SANITY AS A DRAFT
    console.log("💾 Saving Draft to Sanity...");
    
    // We need the write-enabled client
    const writeClient = client.withConfig({
      token: process.env.SANITY_API_TOKEN,
      useCdn: false
    });

    const doc = {
      _type: 'post',
      // The 'drafts.' prefix makes it hidden from the live site until you publish it!
      _id: `drafts.ai-blog-${Date.now()}`,
      title: aiData.title,
      slug: { 
        _type: 'slug', 
        current: aiData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') 
      },
      author: 'North Capital Research Team',
      excerpt: aiData.excerpt,
      keyTakeaways: aiData.keyTakeaways,
      faqs: aiData.faqs,
      body: aiData.bodyBlocks,
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