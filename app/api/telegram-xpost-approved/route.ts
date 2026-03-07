import { NextResponse } from 'next/server';
import { sendTelegram } from '@/lib/telegram';

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.SANITY_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { postText, suggestedHashtags, dealTitle } = payload;

    if (!postText) {
      return NextResponse.json({ error: 'Missing postText' }, { status: 400 });
    }

    await sendTelegram(
`✅ <b>POST APPROVED — READY TO PUBLISH</b>
${dealTitle ? `<i>${dealTitle}</i>\n` : ''}
<code>${postText}</code>

${suggestedHashtags || ''}`
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Telegram approval webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
