import type { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'
import { Clock, Globe, Mail, MessageSquare, FileText, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Automations — Admin',
  robots: { index: false, follow: false },
}

type AutomationStatus = 'active' | 'missing' | 'manual'

type Automation = {
  name: string
  route: string
  trigger: string
  schedule?: string
  what: string
  outputs: string
  auth: string
  external: string[]
  status: AutomationStatus
}

const AUTOMATIONS: Automation[] = [
  {
    name: 'Fetch Rental Listings',
    route: '/api/cron/fetch-rental-listings',
    trigger: 'cron-job.org',
    schedule: 'Daily 06:00 UTC',
    what: 'Fetches PropertyFinder rental listings via RapidAPI and upserts into rental_listings table',
    outputs: 'rental_listings (1,168 rows)',
    auth: 'Bearer CRON_SECRET',
    external: ['RapidAPI / PropertyFinder'],
    status: 'active',
  },
  {
    name: 'Snapshot Distress Listings',
    route: '/api/cron/snapshot-distress-listings',
    trigger: 'cron-job.org',
    schedule: 'Daily 06:30 UTC',
    what: 'Snapshots PF listings into distress_listings, detects price drops, flags tier-1 deals to Telegram',
    outputs: 'distress_listings, Telegram alerts',
    auth: 'Bearer CRON_SECRET',
    external: ['RapidAPI / PropertyFinder', 'Telegram'],
    status: 'active',
  },
  {
    name: 'Fetch Bayut Transactions',
    route: '/api/cron/fetch-bayut-transactions',
    trigger: 'cron-job.org',
    schedule: 'Daily 06:45 UTC',
    what: 'Ingests Bayut transaction data (for-sale + for-rent), 25 pages/run, 800/mo budget guard, refreshes mv_txn_monthly_unified',
    outputs: 'bayut_transactions, mv_txn_monthly_unified',
    auth: 'Bearer CRON_SECRET',
    external: ['RapidAPI / Bayut14'],
    status: 'missing',
  },
  {
    name: 'Generate X Posts',
    route: '/api/cron/generate-x-posts',
    trigger: 'cron-job.org',
    schedule: 'Daily',
    what: 'Fetches top distress deals from PF, uses Gemini to write 3 X posts, sends drafts to Telegram for copy-paste',
    outputs: 'Telegram (X post drafts)',
    auth: 'Bearer CRON_SECRET',
    external: ['RapidAPI / PropertyFinder', 'Gemini 2.5 Flash', 'Telegram'],
    status: 'active',
  },
  {
    name: 'Generate LinkedIn Posts',
    route: '/api/cron/generate-linkedin-posts',
    trigger: 'cron-job.org',
    schedule: 'Daily',
    what: 'Rotates 3 LinkedIn formats (Distress Spotlight / Market Take / Data Drop), sends draft to Telegram',
    outputs: 'Telegram (LinkedIn draft)',
    auth: 'Bearer CRON_SECRET',
    external: ['RapidAPI / PropertyFinder', 'Gemini 2.5 Flash', 'Telegram'],
    status: 'active',
  },
  {
    name: 'Generate Video Shorts',
    route: '/api/cron/generate-video-shorts',
    trigger: 'cron-job.org',
    schedule: 'Daily',
    what: 'Top PF distress deal → 15s 9:16 Shotstack video with HTML overlay → MP4 URL sent to Telegram',
    outputs: 'Telegram (MP4 link)',
    auth: 'Bearer CRON_SECRET',
    external: ['RapidAPI / PropertyFinder', 'Shotstack', 'Telegram'],
    status: 'active',
  },
  {
    name: 'Telegram Distress Digest',
    route: '/api/cron/telegram-distress-digest',
    trigger: 'cron-job.org',
    schedule: 'Daily',
    what: 'Top 10 distress deals merged from Bayut + PF, sorted by discount %, sent to Telegram',
    outputs: 'Telegram message',
    auth: 'Bearer CRON_SECRET',
    external: ['RapidAPI / Bayut14', 'RapidAPI / PropertyFinder', 'Telegram'],
    status: 'active',
  },
  {
    name: 'Generate Market Briefing',
    route: '/api/cron/generate-market-briefing',
    trigger: 'cron-job.org',
    schedule: 'Monday 06:00 UTC',
    what: 'Pulls top DLD areas by volume + distress stats, Gemini writes 500-word institutional brief, stores in DB',
    outputs: 'market_briefings table, Telegram',
    auth: 'Bearer CRON_SECRET',
    external: ['Gemini 2.5 Flash', 'Telegram'],
    status: 'active',
  },
  {
    name: 'Weekly Distress Email Digest',
    route: '/api/cron/weekly-distress-digest',
    trigger: 'cron-job.org',
    schedule: 'Monday 07:00 UTC',
    what: 'Top 5 distress deals → Gemini writes email body → Resend sends to all active email_leads subscribers',
    outputs: 'Email to all subscribers',
    auth: 'Bearer CRON_SECRET',
    external: ['Gemini 2.5 Flash', 'Resend'],
    status: 'active',
  },
  {
    name: 'Reddit Monitor',
    route: '/api/reddit-monitor',
    trigger: 'cron-job.org',
    schedule: 'Daily',
    what: 'Scrapes r/DubaiExpats, r/dubai etc for investment posts, generates AI reply drafts with market data, sends to Telegram',
    outputs: 'Telegram (reply drafts)',
    auth: 'Bearer CRON_SECRET',
    external: ['Reddit public API', 'Gemini 2.5 Flash', 'Telegram'],
    status: 'active',
  },
  {
    name: 'AI Blog Generator',
    route: '/api/ai-blog-generator',
    trigger: 'Gmail Apps Script (label trigger)',
    what: 'Email subject + body (or PDF) → Gemini → Sanity draft blog post',
    outputs: 'Sanity draft',
    auth: 'BLOG_GENERATOR_SECRET',
    external: ['Gemini 2.5 Flash', 'Sanity CMS'],
    status: 'active',
  },
  {
    name: 'Blog → X Post',
    route: '/api/ai-blog-to-xpost',
    trigger: 'Sanity webhook (on publish)',
    what: 'Published blog post → Gemini writes X post draft → Telegram',
    outputs: 'Telegram (X draft)',
    auth: 'SANITY_WEBHOOK_SECRET',
    external: ['Gemini 2.5 Flash', 'Telegram'],
    status: 'active',
  },
  {
    name: 'Project PDF (Email)',
    route: '/api/project-pdf-email',
    trigger: 'Gmail Apps Script (PDF label)',
    what: 'Developer PDF attached to email → Gemini extracts project data → Sanity draft',
    outputs: 'Sanity draft',
    auth: 'BLOG_GENERATOR_SECRET',
    external: ['Gemini 2.5 Flash', 'Sanity CMS'],
    status: 'active',
  },
  {
    name: 'Telegram Bot',
    route: '/api/telegram-webhook',
    trigger: 'Telegram (webhook)',
    what: '/leads and /briefing commands return DB stats; any URL triggers blog generation in background',
    outputs: 'Telegram replies',
    auth: 'TELEGRAM_WEBHOOK_SECRET',
    external: ['Telegram'],
    status: 'active',
  },
]

const STATUS_META: Record<AutomationStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  missing: { label: 'Not Set Up', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  manual: { label: 'Manual', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
}

const TRIGGER_ICON: Record<string, LucideIcon> = {
  'cron-job.org': Clock,
  'Gmail Apps Script (label trigger)': Mail,
  'Gmail Apps Script (PDF label)': FileText,
  'Sanity webhook (on publish)': Globe,
  'Telegram (webhook)': MessageSquare,
}

export default function AdminAutomationsPage() {
  const active = AUTOMATIONS.filter(a => a.status === 'active').length
  const missing = AUTOMATIONS.filter(a => a.status === 'missing').length
  const crons = AUTOMATIONS.filter(a => a.trigger === 'cron-job.org').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Automations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All cron jobs, webhooks, and trigger-based automations across the platform.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: AUTOMATIONS.length, color: 'text-foreground' },
          { label: 'Active', value: active, color: 'text-emerald-400' },
          { label: 'Not Set Up', value: missing, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border/50 bg-card p-3">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className={`font-mono text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {AUTOMATIONS.map((a) => {
          const TriggerIcon = TRIGGER_ICON[a.trigger] ?? Zap
          const status = STATUS_META[a.status]
          return (
            <div
              key={a.route}
              className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-3"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <TriggerIcon className="h-4 w-4 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{a.route}</p>
                  </div>
                </div>
                <span className={cn('shrink-0 rounded border px-2 py-0.5 text-[10px] font-mono font-medium', status.color)}>
                  {status.label}
                </span>
              </div>

              {/* What it does */}
              <p className="text-xs text-muted-foreground leading-relaxed">{a.what}</p>

              {/* Meta row */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] font-mono text-muted-foreground">
                <span><span className="text-muted-foreground/50 uppercase mr-1">Trigger</span>{a.trigger}{a.schedule ? ` · ${a.schedule}` : ''}</span>
                <span><span className="text-muted-foreground/50 uppercase mr-1">Auth</span>{a.auth}</span>
                <span><span className="text-muted-foreground/50 uppercase mr-1">Output</span>{a.outputs}</span>
              </div>

              {/* External services */}
              {a.external.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {a.external.map(svc => (
                    <span key={svc} className="rounded border border-border/40 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {svc}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
