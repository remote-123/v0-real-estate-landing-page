
# Project Context: North Capital DXB

## 🏢 Project Overview
North Capital DXB is an institutional-grade, boutique real estate advisory firm based in Dubai. This platform is a high-converting, AEO/SEO-optimized Next.js web application coupled with a fully automated AI content pipeline. 

The platform does not target generic buyers; it targets high-net-worth global expats looking for tax-free yields, capital preservation, and currency hedging. The UI/UX is built to convert, utilizing sticky ROI calculators, context-aware Lead Forms, and data-driven investment theses.

## 🛠 Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Styling:** Tailwind CSS, shadcn/ui components
- **Icons:** lucide-react
- **CMS / Database:** Sanity.io (v3, GROQ queries)
- **AI Integration:** Google Generative AI SDK (`gemini-3-flash-preview` strictly for multimodal processing)
- **Automation Pipeline:** Google Apps Script (Gmail Webhooks) -> Next.js API Routes -> Sanity

## 🧠 The AI Pipeline Architecture (The Command Center)
The platform features an automated content engine:
1. **Gmail Labels:** PR emails/Developer PDFs are tagged with `ai-blog` or `ai-project` in Gmail.
2. **Apps Script Router:** A cron job rips HTML, PDFs, and Images from the email and sends them to Next.js via webhook.
3. **Next.js Multimodal APIs:** `/api/ai-blog-generator` and `/api/ai-project-generator` receive the payload.
4. **Gemini 3 Flash Preview:** Processes the multimodal data using strict JSON formatting rules.
5. **Sanity Drafts:** The JSON is mapped to Sanity schemas and saved as drafts.
6. **Tagging:** The script tags the email with `upload-pic` or `ai-error` based on the HTTP response.

## 🖋 Brand Persona & Tone (Critical for Content Generation)
*If generating copy, UI text, or AI prompts, adhere strictly to these rules (derived from `lib/ai-guidelines.ts`):*
- **Role:** Senior Investment Strategist and Managing Director.
- **Tone:** Direct, analytical, objective, and slightly contrarian. Focus on ROI, capital appreciation, and liquidity. Never sound desperate for a sale.
- **Banned Words:** delve, testament, rapidly emerging, game-changer, unparalleled, seamless, dynamic, landscape, tapestry, beacon, luxurious, stunning, masterpiece, nestled.
- **Writing Rule:** Strip developer "fluff". Translate "stunning oasis" to "low-density community".
- **The 5 Pillars of Project Analysis:** Macro Thesis, Core Metrics, The Bull Case, The Bear Case (Who Should Pass - crucial for trust), The North Capital Verdict.

## 💻 Coding Conventions & Best Practices
1. **AEO & SEO:** - All dynamic pages (`/projects/[slug]`, `/blog/[slug]`) MUST include JSON-LD structured data. 
   - Use `RealEstateListing` for projects and `FAQPage` for dynamically generated Q&As.
2. **Sanity Integration:** - Use `client.fetch(query)` with GROQ.
   - For images, always use the `urlForImage` builder from `@/sanity/lib/image`.
   - Never use the old `asset->url` in GROQ if passing to the image builder.
3. **Error Handling & API Routes:** - Webhook APIs must be protected by a `secret` key.
   - Always wrap AI calls in `try/catch`. 
   - Return strict `500` HTTP status codes on failure so the Apps Script router can apply the `ai-error` label.
4. **UI Components:** - Keep components modular. 
   - Use `lucide-react` for iconography. 
   - Use Next.js `<Image>` tags with `fill` and `object-cover` for responsive imagery.

## 🎯 Conversion Strategy
- Every blog and project page must end with the `<LeadForm>` component.
- The `projectName` prop on `<LeadForm>` must dynamically track the source (e.g., `projectName={"Blog: " + post.title}`).
- Project pages should feature the sticky `<ROICalculator />` in the desktop sidebar for interactive engagement.