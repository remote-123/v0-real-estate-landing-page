import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "next-sanity"
import { getGeminiPrompt, PROJECT_JSON_FORMAT } from "@/lib/ai-guidelines" // <-- 1. IMPORT YOUR SKILL

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

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
    
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Pdf = buffer.toString("base64")

    // You are using the extremely fast flash model, which is perfect here.
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }) 

    // 2. INJECT THE WEALTH ADVISOR BRAIN + PROJECT JSON FORMAT
    const prompt = getGeminiPrompt(PROJECT_JSON_FORMAT)

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Pdf,
          mimeType: "application/pdf"
        }
      }
    ])

    const responseText = result.response.text()
    const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim()
    const extractedData = JSON.parse(jsonString)

    const generateKey = () => Math.random().toString(36).substring(2, 9)

    if (Array.isArray(extractedData.details)) {
      extractedData.details = extractedData.details.map((item: any) => ({ ...item, _key: generateKey() }))
    }

    if (Array.isArray(extractedData.connectivity)) {
      extractedData.connectivity = extractedData.connectivity.map((item: any) => ({ ...item, _key: generateKey() }))
    }

    const newProject = await writeClient.create({
      _type: "project",
      ...extractedData,
      slug: { current: extractedData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
    })

    return NextResponse.json({ success: true, id: newProject._id })

  } catch (error: any) {
    console.error("Import Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}