/**
 * Deploy announcement — generates 3 Telegram SMM messages via Claude and sends them.
 *
 * Usage (run from Claude Code or terminal):
 *   npm run announce-deploy -- "Price Index chart" "YoY stat cards" --url /terminal/price-index
 *   npm run announce-deploy -- "Distress Deals V2" --mode immediate
 *
 * Flags:
 *   --url <path>    Terminal page path (default: /terminal)
 *   --mode queue    msg 1 → channel now, msgs 2+3 → SMM queue thread (default)
 *   --mode immediate  all 3 → channel, staggered 4s apart
 */
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags: Record<string, string> = {};
const features: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    flags[args[i].slice(2)] = args[i + 1] ?? '';
    i++;
  } else {
    features.push(args[i]);
  }
}

if (features.length === 0) {
  console.error('Provide at least one feature name.');
  console.error('Example: npm run announce-deploy -- "Price Index chart" "YoY cards"');
  process.exit(1);
}

const siteUrl = 'https://northcapitaldxb.com';
const pagePath = flags.url ?? '/terminal';
const url = `${siteUrl}${pagePath.startsWith('/') ? pagePath : '/' + pagePath}`;
const mode = (flags.mode ?? 'queue') as 'queue' | 'immediate';

// ── Claude ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You write Telegram channel messages for North Capital DXB — a Dubai real estate data terminal. Tone: data-first, direct, no hype. Audience: Dubai property investors who distrust broker fluff.

Given a list of features just deployed and a URL, generate exactly 3 messages:

1 — Teaser. State what shipped. No setup copy. Max 2 lines + link.
2 — Investor problem angle. Name the pain this fixes. Reference DLD data or market timing as the credibility anchor. Max 4 lines + link.
3 — Remove barriers. Mention "free, no signup, no paywall." List 2–3 other terminal pages to show depth. End with a direct CTA + link.

Rules:
- Max 280 characters per message
- Telegram HTML only: <b>, <i>, <code>, <a href="">
- No exclamation marks
- Banned words: innovative, powerful, seamless, streamline, game-changer
- Write for a Bloomberg terminal reader, not a property brochure

Output ONLY valid JSON, no markdown:
{"messages":[{"label":"teaser","text":"..."},{"label":"benefit","text":"..."},{"label":"cta","text":"..."}]}`;

async function generateMessages(features: string[], url: string) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Features: ${features.join(' + ')}\nURL: ${url}` }],
  });

  const raw = (res.content[0] as { type: string; text: string }).text.trim();
  const parsed = JSON.parse(raw);
  return parsed.messages as { label: string; text: string }[];
}

// ── Telegram ──────────────────────────────────────────────────────────────────

async function sendTelegram(text: string, threadId?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = threadId
    ? process.env.TELEGRAM_GROUP_CHAT_ID
    : (process.env.TELEGRAM_GROUP_CHAT_ID ?? process.env.TELEGRAM_CHAT_ID);

  if (!token || !chatId) {
    console.warn('  [skip] Telegram not configured');
    return;
  }

  const payload: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (threadId) payload.message_thread_id = threadId;

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!r.ok) console.error(`  Telegram error ${r.status}:`, await r.text());
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function strip(html: string) { return html.replace(/<[^>]+>/g, ''); }

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\nGenerating messages for: ${features.join(', ')}`);
  console.log(`URL: ${url} | mode: ${mode}\n`);

  const messages = await generateMessages(features, url);
  const [teaser, benefit, cta] = messages;

  if (mode === 'immediate') {
    for (const msg of messages) {
      console.log(`→ Sending [${msg.label}] to channel`);
      console.log(`  ${strip(msg.text)}\n`);
      await sendTelegram(msg.text);
      await delay(4000);
    }
  } else {
    // msg 1 → channel now
    console.log(`→ Sending [${teaser.label}] to channel`);
    console.log(`  ${strip(teaser.text)}\n`);
    await sendTelegram(teaser.text);

    // msgs 2+3 → SMM queue thread as a draft block
    const queueThread = process.env.TELEGRAM_THREAD_ID_SMM_QUEUE;
    const draft = [
      `📋 <b>SMM Queue</b> — ${features.join(', ')}`,
      '',
      `<b>MSG 2 (benefit) — ~6h after deploy:</b>\n${benefit.text}`,
      '',
      `<b>MSG 3 (CTA) — ~48h after deploy:</b>\n${cta.text}`,
    ].join('\n');

    console.log(`→ Sending [${benefit.label}] + [${cta.label}] to SMM queue thread`);
    await sendTelegram(draft, queueThread);
  }

  console.log('✓ Done');
}

run().catch(err => { console.error(err); process.exit(1); });
