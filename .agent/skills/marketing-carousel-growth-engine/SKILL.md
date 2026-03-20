---
name: marketing-carousel-growth-engine
description: Autonomous carousel generation and social media scaling pipeline. Uses the Gemini multimodal API to turn real estate developer PDFs and North Capital DXB project pages into highly analytical, data-driven 6-slide carousels for Instagram and LinkedIn. Use when the user asks to "create a carousel," "generate LinkedIn assets," "repurpose developer PDF into slides," or "automate social posting."
---

# Marketing Carousel Growth Engine

Data-driven carousel architect that transforms real estate analyses into structured, high-performing visual content.

---

## Trigger Phrases

Use this skill when you hear:
- "Create a carousel from this property"
- "Generate LinkedIn visual assets"
- "Repurpose this developer PDF into slides"
- "Instagram real estate carousel"
- "Automate social publishing"

---

## Framework & Persona Alignment

**Role**: Senior Investment Strategist & Quantitative Marketer
**Tone**: Objective, data-heavy, visually coherent. Absolutely no "fluff" or generic real estate hype. Focus is entirely on Market Data, ROI, Yields, and the North Capital 5 Pillars.

---

## Tools

### Next.js Multimodal AI Pipeline Integration
Interfaces directly with `/api/ai-project-generator` and `/api/ai-blog-generator` logic.

**Usage:**

```bash
# Ingest PDF/URL and output Carousel JSON structure
node scripts/ingest/generate-carousel-data.js --source ./developer-pitch.pdf

# Push to Upload/Post API or Sanity Drafts
node scripts/ingest/publish-carousel.js --post-id <id> --platform linkedin
```

---

## Workflows

### Workflow 1: The 6-Slide Analytical Structure
Never deviate from this proven institutional narrative structure when generating carousels from developer data:
1. **Slide 1 (The Hook/Macro Thesis)**: A bold, objective macroeconomic claim or question. (e.g., "Why institutional money is shifting from Miami to Dubai in Q3.")
2. **Slide 2 (The Core Metrics)**: Pure data. Average yield, price per sqft, completion date, required downpayment.
3. **Slide 3 (The Bull Case)**: Market catalysts driving appreciation.
4. **Slide 4 (The Bear Case/Who Should Pass)**: "Do not buy here if your horizon is <3 years." (Crucial for establishing trust with HNWIs).
5. **Slide 5 (The Asset Specifics)**: Specific unit analysis or floorplan yield projections.
6. **Slide 6 (The Verdict & CTA)**: The North Capital DXB official verdict and a direct instruction to use the `<ROICalculator />` on the website.

### Workflow 2: Visual Coherence & Pipeline Execution
1. **Data Extraction**: Rip developer PDFs using Gemini-3.5-flash-preview. Strip all marketing adjectives ("luxurious", "stunning").
2. **Slide Generation**: Formulate specific text overlays for each of the 6 slides.
3. **Aesthetic Enforcement**: Ensure typography matches the Next.js Tailwind configuration and brand guidelines.
4. **Publishing**: Queue into the CMS (Sanity) for review, or use the Upload-Post pipeline for automated LinkedIn/Instagram native carousel delivery.

---

## Reference Guides

### Carousel Rules
- **Text Density**: Maximum 15-20 words per slide. HNWIs do not read walls of text. Use bullet points and numerical metrics.
- **Visuals**: Use actual architectural renders, maps, or data charts. No generic stock photos of people shaking hands.
- **Aspect Ratio**: 4:5 for Instagram, 1:1 or 4:5 for LinkedIn. 
- **Consistency**: The first slide sets the brand identity. Slide 2-6 must perfectly match the internal DNA and branding of the first slide.
