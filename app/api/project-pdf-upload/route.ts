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
    const formData = await req.formData()
    const file = formData.get("file") as File
    const passcode = formData.get("passcode") as string
    
    // 1. SECURITY CHECK 
    if (passcode !== process.env.ADMIN_PASSCODE) {
      return NextResponse.json({ error: "Unauthorized: Invalid passcode" }, { status: 401 })
    }

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    // 2. CONVERT PDF TO BASE64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Pdf = buffer.toString("base64")

    // 3. DEFINE THE PROMPT (This was the missing line!)
    const prompt = getGeminiPrompt(PROJECT_JSON_FORMAT)

    let result;
    
    // 4. PACKAGE THE PAYLOAD
    const promptParts: any[] = [
      prompt,
      {
        inlineData: { data: base64Pdf, mimeType: file.type || "application/pdf" }
      }
    ];

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
      result = await model.generateContent(promptParts)
    } catch (modelError: any) {
      console.warn(`⚠️ gemini-2.5-flash failed (${modelError.message}). Falling back to gemini-1.5-flash...`)
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      result = await fallbackModel.generateContent(promptParts)
    }

    // 6. PARSE THE RESPONSE
    const responseText = result.response.text()
    const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim()
    const extractedData = JSON.parse(jsonString)

    // 7. ADD SANITY IDENTIFIERS
    const generateKey = () => Math.random().toString(36).substring(2, 9)
    if (Array.isArray(extractedData.details)) {
      extractedData.details = extractedData.details.map((item: any) => ({ ...item, _key: generateKey() }))
    }
    if (Array.isArray(extractedData.connectivity)) {
      extractedData.connectivity = extractedData.connectivity.map((item: any) => ({ ...item, _key: generateKey() }))
    }
    if (Array.isArray(extractedData.faqs)) {
      extractedData.faqs = extractedData.faqs.map((item: any) => ({ ...item, _key: generateKey() }))
    }

    // 8. SAVE TO SANITY AS A DRAFT
    const newProject = await writeClient.create({
      _type: "project",
      _id: `drafts.ai-project-manual-${Date.now()}`, 
      ...extractedData,
      slug: { current: extractedData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
    })

    return NextResponse.json({ success: true, id: newProject._id })

  } catch (error: any) {
    console.error("❌ Manual Import Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}