/**
 * Co-Founder Heartbeat
 *
 * Reads mission, current todo list, and recent logs.
 * Generates two outputs via Claude:
 *   1. Product/dev backlog — 10 prioritised tasks you can act on in Claude Code
 *   2. Marketing content — 4 ready-to-post drafts (Telegram, LinkedIn, Reddit)
 *
 * Sends both to your Telegram SMM queue thread so you can pick what to act on.
 * Writes a dated backlog file to state/ for review.
 *
 * Usage:
 *   npm run heartbeat
 *
 * Cron (cron-job.org):
 *   POST https://northcapitaldxb.com/api/heartbeat  (or run locally via npm)
 *   Suggested cadence: every 2-3 days
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'state/cofounder.json');
const MISSION_FILE = path.join(ROOT, 'docs/product-marketing-context.md');
const TODO_FILE = path.join(ROOT, 'todo.md');
const DAILY_LOG_FILE = path.join(ROOT, 'DAILY_LOG.md');

// ── Helpers ───────────────────────────────────────────────────────────────────

function read(filePath: string, maxLines = 80): string {
  try {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    return lines.slice(0, maxLines).join('\n');
  } catch {
    return '';
  }
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastRun: null, runsCompleted: 0, taskDismissals: {}, completedTasks: [], learnings: [] }; }
}

function saveState(state: Record<string, unknown>) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function sendTelegram(text: string, threadId?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = threadId
    ? process.env.TELEGRAM_GROUP_CHAT_ID
    : (process.env.TELEGRAM_GROUP_CHAT_ID ?? process.env.TELEGRAM_CHAT_ID);
  if (!token || !chatId) { console.warn('  [skip] Telegram not configured'); return; }

  const payload: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (threadId) payload.message_thread_id = threadId;

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) console.error(`  Telegram ${r.status}:`, await r.text());
}

function today() { return new Date().toISOString().slice(0, 10); }

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(mission: string, todo: string, log: string, state: Record<string, unknown>): string {
  return `You are the co-founder of North Capital DXB. Review the context below and produce a prioritised work plan.

=== MISSION ===
${mission}

=== CURRENT TODO.MD (first 80 lines) ===
${todo || '(empty)'}

=== RECENT DAILY LOG (first 80 lines) ===
${log || '(empty)'}

=== AGENT STATE ===
Last run: ${state.lastRun ?? 'never'}
Runs completed: ${state.runsCompleted ?? 0}
Previous learnings: ${JSON.stringify(state.learnings ?? [])}

---

The website has five areas. Not all need equal attention at all times — your job is to assess each one first, then only assign tasks where there is a genuine gap.

AREAS:
1. TERMINAL — /terminal/* — free DLD data hub. Drives organic trust and repeat visits.
2. HOMEPAGE — northcapitaldxb.com — advisory positioning, case studies, testimonials, featured projects. First impression for HNW leads.
3. BLOG — /blog — SEO content, market analysis, project breakdowns. Builds search authority.
4. ABOUT — /about — founder credibility, RERA, why Dubai. Converts warm traffic.
5. ADVISORY FUNNEL — consultation booking, WhatsApp, email CTA. Revenue conversion layer.

STEP 1 — Assess each area based on the todo list, daily log, and your knowledge of the product. For each area assign: status (strong | adequate | needs-work | unknown) and one sentence explaining why.

STEP 2 — Generate tasks ONLY for areas that are "needs-work" or "unknown". Do not generate tasks for areas that are already "strong" or "adequate". Quality over coverage.

STEP 3 — Same logic for marketing: assess which channels have recent activity (visible in the log) and which are starved. Only generate drafts for channels that need feeding.

Produce a JSON object with exactly this structure:

{
  "site_assessment": {
    "terminal": { "status": "strong | adequate | needs-work | unknown", "reason": "..." },
    "homepage": { "status": "strong | adequate | needs-work | unknown", "reason": "..." },
    "blog": { "status": "strong | adequate | needs-work | unknown", "reason": "..." },
    "about": { "status": "strong | adequate | needs-work | unknown", "reason": "..." },
    "advisory_funnel": { "status": "strong | adequate | needs-work | unknown", "reason": "..." }
  },
  "product_tasks": [
    {
      "id": "p1",
      "title": "Short task title",
      "rationale": "One sentence — why this moves the mission forward",
      "effort": "S | M | L",
      "area": "terminal | homepage | blog | about | advisory | seo | backend | pipeline | ux | trust"
    }
  ],
  "marketing_tasks": [
    {
      "id": "m1",
      "channel": "telegram | linkedin | reddit | blog | seo",
      "title": "Short task title",
      "rationale": "One sentence — why this channel needs feeding right now",
      "draft": "The full ready-to-post content. For telegram: HTML formatted, max 280 chars. For linkedin: full post with hook, body, CTA. For reddit: full reply/post. For blog: specific H1, 3-sentence investment angle summary, 4 section headings. No placeholders — write it as if publishing now."
    }
  ],
  "learning": "One sentence observation about the product/growth stage based on what you see in todo and log."
}

Rules:
- product_tasks: 5–10 items. Only from areas assessed as needs-work or unknown. If 3 areas are strong, you may produce only 4-5 tasks. Never pad with low-value work.
- marketing_tasks: 4–8 items. Only for channels that are starved or have high-leverage opportunities right now. Every draft must be complete and ready to post.
- LinkedIn hooks must open with a data point (AED, %, DLD source). No "I'm excited to share". No exclamation marks.
- Reddit drafts sound like a knowledgeable community member. Never mention the website in the opening line. Lead with useful information.
- Telegram drafts use HTML only: <b>, <i>, <a href="">
- Do not suggest tasks already marked [x] in todo.md.
- Output ONLY valid JSON. No markdown fences, no commentary.`;
}

// ── Format for Telegram (splits into 2 messages: product + marketing) ─────────

const STATUS_ICON: Record<string, string> = {
  strong: '✅',
  adequate: '🟡',
  'needs-work': '🔴',
  unknown: '⚪',
};

function formatProductMsg(
  assessment: Record<string, { status: string; reason: string }>,
  tasks: { id: string; title: string; rationale: string; effort: string; area: string }[],
  date: string
): string {
  const lines = [
    `🧠 <b>CO-FOUNDER REVIEW — ${date}</b>`,
    '',
    '<b>SITE ASSESSMENT</b>',
  ];
  for (const [area, { status, reason }] of Object.entries(assessment)) {
    lines.push(`${STATUS_ICON[status] ?? '⚪'} <b>${area}</b> — ${reason}`);
  }
  lines.push('');
  lines.push(`<b>BACKLOG</b> (${tasks.length} tasks — you pick priority)`);
  lines.push('');
  tasks.forEach((t, i) => {
    lines.push(`<b>${i + 1}. ${t.title}</b> [${t.effort}] <i>${t.area}</i>`);
    lines.push(`   ${t.rationale}`);
    lines.push('');
  });
  return lines.join('\n').slice(0, 4000);
}

function formatMarketingMsg(tasks: { id: string; channel: string; title: string; rationale: string; draft: string }[], date: string): string {
  const lines = [
    `📣 <b>MARKETING QUEUE — ${date}</b>`,
    '<i>All drafts ready to post. Forward to channel or copy-paste.</i>',
    '',
  ];
  tasks.forEach((t, i) => {
    lines.push(`<b>${i + 1}. [${t.channel.toUpperCase()}] ${t.title}</b>`);
    lines.push(`<i>${t.rationale}</i>`);
    lines.push('');
    lines.push(t.draft);
    lines.push('──────────────');
    lines.push('');
  });
  return lines.join('\n').slice(0, 4000);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const date = today();
  console.log(`\nCo-Founder Heartbeat — ${date}\n`);

  const state = loadState();
  const mission = read(MISSION_FILE, 150);
  const todo = read(TODO_FILE, 80);
  const log = read(DAILY_LOG_FILE, 80);

  console.log('Generating backlog via Claude...');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{ role: 'user', content: buildPrompt(mission, todo, log, state) }],
  });

  const raw = (res.content[0] as { type: string; text: string }).text.trim();

  let parsed: {
    site_assessment: Record<string, { status: string; reason: string }>;
    product_tasks: { id: string; title: string; rationale: string; effort: string; area: string }[];
    marketing_tasks: { id: string; channel: string; title: string; rationale: string; draft: string }[];
    learning: string;
  };

  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error('Claude returned invalid JSON:', raw.slice(0, 300));
    process.exit(1);
  }

  // Write dated backlog file
  const backlogPath = path.join(ROOT, `state/backlog-${date}.md`);
  const assessmentLines = Object.entries(parsed.site_assessment ?? {})
    .map(([area, { status, reason }]) => `- **${area}**: ${status} — ${reason}`)
    .join('\n');
  const backlogContent = [
    `# Backlog — ${date}`,
    '',
    '## Site Assessment',
    assessmentLines,
    '',
    '## Product / Dev',
    parsed.product_tasks.map((t, i) => `${i + 1}. **[${t.effort}] ${t.title}** (${t.area})\n   ${t.rationale}`).join('\n'),
    '',
    '## Marketing (ready to post)',
    parsed.marketing_tasks.map((t, i) => `### ${i + 1}. [${t.channel.toUpperCase()}] ${t.title}\n_${t.rationale}_\n\n${t.draft}`).join('\n\n---\n\n'),
    '',
    `## Learning\n${parsed.learning}`,
  ].join('\n');

  fs.writeFileSync(backlogPath, backlogContent);
  console.log(`✓ Backlog written to state/backlog-${date}.md`);

  // Send to Telegram SMM queue thread
  const queueThread = process.env.TELEGRAM_THREAD_ID_SMM_QUEUE;

  console.log('Sending product backlog to Telegram...');
  await sendTelegram(formatProductMsg(parsed.site_assessment ?? {}, parsed.product_tasks, date), queueThread);

  await new Promise(r => setTimeout(r, 2000));

  console.log('Sending marketing queue to Telegram...');
  await sendTelegram(formatMarketingMsg(parsed.marketing_tasks, date), queueThread);

  // Update state
  state.lastRun = date;
  state.runsCompleted = (state.runsCompleted ?? 0) + 1;
  if (!Array.isArray(state.learnings)) state.learnings = [];
  (state.learnings as string[]).unshift(`[${date}] ${parsed.learning}`);
  if ((state.learnings as string[]).length > 20) (state.learnings as string[]).length = 20;
  saveState(state);

  console.log(`\n✓ Done. Learning: ${parsed.learning}\n`);

  // Print summary to console
  console.log('── PRODUCT TASKS ──');
  parsed.product_tasks.forEach((t, i) => console.log(`${i + 1}. [${t.effort}] ${t.title}`));
  console.log('\n── MARKETING DRAFTS ──');
  parsed.marketing_tasks.forEach((t, i) => console.log(`${i + 1}. [${t.channel}] ${t.title}`));
}

run().catch(err => { console.error(err); process.exit(1); });
