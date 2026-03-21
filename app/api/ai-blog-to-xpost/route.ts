import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NORTH_CAPITAL_SYSTEM_PROMPT } from '@/lib/ai-guidelines';
import { sendTelegram, sendTelegramError } from '@/lib/telegram';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_BLOG_API_KEY!);

const BLOG_XPOST_PROMPT = `
You are a senior investment strategist writing for X (Twitter). Your audience is high-net-worth global investors — they are analytical, data-literate, and deeply sceptical of generic real estate marketing.

BRAND VOICE:
- Tone: Institutional, contrarian, direct. Like a Bloomberg terminal analyst, not a broker.
- Style: Active voice. Confident. Never desperate or promotional.
- You treat real estate as a financial instrument first, a physical asset second.

AUDIENCE PAIN POINTS (write to at least one):
- Fear of making a bad investment in a Dubai "bubble"
- Scepticism of every brokerage claiming everything is a "masterpiece"
- Seeking hard-currency yield in a tax-free environment
- Wanting the "institutional verdict" — someone who will tell them to PASS on a bad deal

TASK: Write ONE X post announcing a new investment thesis blog post.

FORMAT RULES:
- Choose ONE of these three formats based on the blog content:
  A) INTELLIGENCE ALERT — open with the sharpest data point or market signal. Make it feel like breaking news for investors.
  B) CONTRARIAN TAKE — open with a bold claim that challenges conventional Dubai property wisdom. Use: "Everyone says [X]. The data says [Y]." or "Nobody flags [X]."
  C) THESIS TEASE — open with a rhetorical question that hits the investor's core anxiety, then position the blog as the answer.

- First line is the hook. It must stop the scroll. Do NOT open with "New blog post", "We just published", or "Check out".
- Tease the thesis — don't give the full answer. Make them click to get the verdict.
- Use line breaks for rhythm. No bullet points. No numbered lists.
- End with the blog URL on its own line.
- Post body (excluding URL) must stay under 260 characters.
- Hashtags go on a separate line AFTER the URL — 3 to 4 only, relevant to the thesis.

FORBIDDEN WORDS: stunning, masterpiece, luxury, unparalleled, nestled, game-changer, seamless, delve, rapidly, exciting, thrilled, proud to announce, we're excited

Also generate:
- imageBrief: One specific visual that would amplify this post. Could be a chart from the blog, a map highlighting the relevant area, a price-per-sqft comparison graphic, or a screenshot of the blog header.

Return STRICTLY as a JSON object — no markdown, no backticks:
{
  "postText": "...",
  "imageBrief": "...",
  "suggestedHashtags": "..."
}
`;

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.SANITY_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
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

    const prompt = `${NORTH_CAPITAL_SYSTEM_PROMPT}\n\n${BLOG_XPOST_PROMPT}\n\nBlog Content:\n${blogContext}`;

    let result;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      result = await model.generateContent(prompt);
    } catch {
      console.warn('⚠️ Gemini 2.5 Flash failed, falling back to gemini-1.5-flash...');
      const fallback = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      result = await fallback.generateContent(prompt);
    }

    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const post = JSON.parse(text);

    await sendTelegram(
`📝 <b>BLOG X DRAFT — READY TO POST</b>
<code>${title}</code>

<code>${post.postText}</code>

<code>${post.suggestedHashtags}</code>

🖼 <b>Image brief:</b> ${post.imageBrief}`,
      process.env.TELEGRAM_THREAD_ID_XPOST
    );

    return NextResponse.json({ success: true });

  } catch (error: any) {
    await sendTelegramError('/api/ai-blog-to-xpost', 'Unexpected error', error);
    console.error('❌ Blog X Post Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
