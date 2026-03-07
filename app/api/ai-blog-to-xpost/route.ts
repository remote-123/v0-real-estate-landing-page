import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from 'next-sanity';
import { NORTH_CAPITAL_SYSTEM_PROMPT } from '@/lib/ai-guidelines';
import { sendTelegram } from '@/lib/telegram';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-02-24',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const BLOG_XPOST_FORMAT = `
TASK: Generate ONE X (Twitter) post announcing a new thesis blog post from North Capital DXB.

You will receive: a blog title, excerpt, key takeaways, and the blog URL.

Rules:
- Do NOT open with "New blog post" or "We just published" — that is weak
- Open with the sharpest insight or data point from the content. Make it feel like an intelligence alert.
- Tease the thesis without giving everything away — the goal is to make them click
- The audience is HNW investors. Speak to their concerns: yield, capital preservation, macro risk, arbitrage
- End with the blog URL on its own line
- Stay under 260 characters EXCLUDING the URL
- Use line breaks for rhythm. No bullet points.
- NEVER use: stunning, masterpiece, luxury, unparalleled, nestled, game-changer, seamless, delve

Also generate:
- imageBrief: A specific description of what visual to pair with this post. Could be a screenshot of the blog header, a chart from the article, or a relevant data visual.
- suggestedHashtags: 3-4 relevant hashtags (e.g., #DubaiRealEstate #MacroThesis #UAEInvesting)

Return STRICTLY as a JSON object — no markdown, no backticks:
{
  "postText": "...",
  "imageBrief": "...",
  "suggestedHashtags": "..."
}
`;

export async function POST(req: Request) {
  try {
    // Verify request is from our Sanity webhook
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.SANITY_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();

    // Sanity webhook sends the document fields via our configured projection
    const { title, slug, excerpt, keyTakeaways } = payload;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Missing required blog fields' }, { status: 400 });
    }

    const blogUrl = `https://www.northcapitaldxb.com/blog/${slug}`;

    const takeawaysText = Array.isArray(keyTakeaways) && keyTakeaways.length > 0
      ? `Key Takeaways:\n${keyTakeaways.map((t: string) => `- ${t}`).join('\n')}`
      : '';

    const blogContext = `
Blog Title: ${title}
Excerpt: ${excerpt || ''}
${takeawaysText}
Blog URL: ${blogUrl}
    `.trim();

    const prompt = `${NORTH_CAPITAL_SYSTEM_PROMPT}\n\n${BLOG_XPOST_FORMAT}\n\nBlog Content:\n${blogContext}`;

    console.log(`🤖 Generating X post for blog: ${title}`);

    let result;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
      result = await model.generateContent(prompt);
    } catch {
      console.warn('⚠️ Gemini 3 failed, falling back to Gemini 2.5 Flash...');
      const fallback = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      result = await fallback.generateContent(prompt);
    }

    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const post = JSON.parse(text);

    const doc = {
      _type: 'xPost',
      _id: `drafts.ai-xpost-blog-${Date.now()}`,
      postText: post.postText,
      imageBrief: post.imageBrief,
      suggestedHashtags: post.suggestedHashtags,
      status: 'draft',
      dealTitle: title,
      dealLocation: 'Blog Post',
      dealExternalUrl: blogUrl,
      generatedAt: new Date().toISOString(),
    };

    const created = await writeClient.create(doc);
    console.log(`✅ X post draft saved for blog: ${created._id}`);

    await sendTelegram(
`📝 <b>BLOG X DRAFT READY</b>
<b>${title}</b>

<code>${post.postText}</code>

${post.suggestedHashtags}

👉 Review in Sanity → approve when ready to post`
    );

    return NextResponse.json({ success: true, draftId: created._id });

  } catch (error: any) {
    console.error('❌ Blog X Post Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
