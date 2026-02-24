import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "next-sanity"

// 1. Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// 2. Initialize a Sanity Client with WRITE access
const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-02-24", // Today's date
  useCdn: false,
  token: process.env.SANITY_API_TOKEN, // This grants write permission!
})

export async function POST(req: Request) {
  try {
    // Grab the PDF from the request
    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Convert PDF to base64 so Gemini can read it
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Pdf = buffer.toString("base64")


// 3. Prompt Gemini 3.1 Pro to extract the data
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" })

    
    const prompt = `
      You are an expert Dubai Real Estate analyst. Read the attached developer factsheet/brochure.
      Extract the following information and return it STRICTLY as a JSON object with no markdown formatting or extra text.
      If you cannot find a specific piece of data, return null for that field.

      Expected JSON format:
      {
        "title": "Project Name (e.g., Altan at Dubai Creek)",
        "developer": "Developer Name (e.g., Emaar)",
        "location": "Project Location / Community",
        "type": "Property Type Subtitle (e.g., Waterfront Apartments)",
        "category": "MUST BE EXACTLY ONE OF: Apartments, Villas, Townhouses, or Penthouses",
        "status": "MUST BE EXACTLY ONE OF: Upcoming, Featured, Selling Now, Pre-Launch, or Sold Out",
        "startingPrice": "e.g., AED 1.8M",
        "paymentPlan": "e.g., 80/20",
        "completion": "e.g., Q4 2028",
        "roi": "Expected ROI (e.g., 8% Net)",
        "uniquenessTitle": "A short, catchy title about the project's unique selling point",
        "uniquenessDescription": "1-2 paragraphs explaining the unique investment value",
        "description": "The main project overview/description",
        "amenities": ["Infinity Pool", "Private Beach", "Gym"],
        "details": [
          { "label": "Unit Types", "value": "1, 2, 3 BR" },
          { "label": "Building Heights", "value": "G+P+20" }
        ],
        "connectivity": [
          { "location": "Downtown Dubai", "duration": "10 Min" },
          { "location": "Dubai Marina", "duration": "25 Min" }
        ]
      }
    `

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
    
    // Clean up Gemini's response (remove markdown backticks if it added them)
    const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim()
    const extractedData = JSON.parse(jsonString)

    // --- NEW: Inject Sanity _keys into arrays of objects ---
    // Helper function to generate a random string for the _key
    const generateKey = () => Math.random().toString(36).substring(2, 9)

    if (Array.isArray(extractedData.details)) {
      extractedData.details = extractedData.details.map((item: any) => ({
        ...item,
        _key: generateKey()
      }))
    }

    if (Array.isArray(extractedData.connectivity)) {
      extractedData.connectivity = extractedData.connectivity.map((item: any) => ({
        ...item,
        _key: generateKey()
      }))
    }


    // 4. Send the extracted data to Sanity as a DRAFT!
    const newProject = await writeClient.create({
      _type: "project",
      ...extractedData,
      // Create a URL-friendly slug automatically
      slug: { current: extractedData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
    })

    return NextResponse.json({ success: true, id: newProject._id })

  } catch (error: any) {
    console.error("Import Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}