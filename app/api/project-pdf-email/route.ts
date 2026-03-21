import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "next-sanity"
import { getGeminiPrompt, PROJECT_JSON_FORMAT } from "@/lib/ai-guidelines"

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_PDF_API_KEY!)

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-02-24",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. SECURITY CHECK
    if (body.secret !== process.env.BLOG_GENERATOR_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. DOWNLOAD THE PDF FROM GOOGLE DRIVE
    const pdfResponse = await fetch(body.pdfUrl);
    if (!pdfResponse.ok) throw new Error("Failed to download PDF from Drive");

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

    // 3. WAKE UP GEMINI
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = getGeminiPrompt(PROJECT_JSON_FORMAT);

    const result = await model.generateContent([
      prompt,
      {
        inlineData: { data: base64Pdf, mimeType: "application/pdf" }
      }
    ]);

    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const extractedData = JSON.parse(jsonString);

    // 4. ADD SANITY IDENTIFIERS
    const generateKey = () => Math.random().toString(36).substring(2, 9);

    if (Array.isArray(extractedData.details)) {
      extractedData.details = extractedData.details.map((item: any) => ({ ...item, _key: generateKey() }));
    }
    if (Array.isArray(extractedData.connectivity)) {
      extractedData.connectivity = extractedData.connectivity.map((item: any) => ({ ...item, _key: generateKey() }));
    }
    // ADD THIS NEW BLOCK:
    if (Array.isArray(extractedData.faqs)) {
      extractedData.faqs = extractedData.faqs.map((item: any) => ({ ...item, _key: generateKey() }));
    }

    // 5. SAVE TO SANITY AS A DRAFT
    const newProject = await writeClient.create({
      _type: "project",
      _id: `drafts.ai-project-${Date.now()}`,
      ...extractedData,
      slug: { current: extractedData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
    });

    return NextResponse.json({ success: true, draftId: newProject._id });

  } catch (error: any) {
    console.error('❌ Project Generation Error:', error);
    // Returning a 500 status tells Apps Script to apply the 'ai-error' label
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}