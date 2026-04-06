/**
 * API Budget & Timing Config
 *
 * Single source of truth for all external API limits, cache TTLs, and cron schedules.
 * Update this file whenever a pipeline is added, removed, or rescheduled.
 * Check estimated monthly totals before adding new pipelines.
 */

// ---------------------------------------------------------------------------
// CACHE TTLs (in seconds — used with Next.js fetch cache / revalidate)
// ---------------------------------------------------------------------------

export const CACHE_TTL = {
  /** Distress sales deals — fed into X posts and terminal */
  distressDeals: 86_400,       // 24 hours
  /** Rental listings — fed into rental drops terminal */
  rentalDrops: 86_400,         // 24 hours
  /** Blog content from Sanity */
  sanityBlog: 3_600,           // 1 hour
  /** Terminal market data from Sanity */
  sanityTerminal: 3_600,       // 1 hour
} as const;

// ---------------------------------------------------------------------------
// CRON SCHEDULES (cron-job.org expressions — UTC)
// ---------------------------------------------------------------------------

export const CRON_SCHEDULES = {
  /** X post generator — once/day, 7AM UTC */
  xPosts:        '0 7 * * *',
  /** LinkedIn post generator — Mon / Wed / Fri, 8AM UTC */
  linkedinPosts: '0 8 * * 1,3,5',
  /** Rental drops cache warm — once/day, 6AM UTC */
  rentalDrops:   '0 6 * * *',
  /** Bayut14 transaction ingest — once/day, 6:45AM UTC */
  bayutIngest:   '45 6 * * *',
} as const;

// ---------------------------------------------------------------------------
// BAYUT14 RAPIDAPI BUDGET (900 requests / month)
// ---------------------------------------------------------------------------

export const BAYUT14_BUDGET = {
  monthlyLimit: 900,

  /**
   * daily cron: 12 for-sale + 13 for-rent = 25 req/day
   * 25 × 30 = 750/month → 150 reserve
   */
  pipelines: {
    dailyIngest: {
      description: 'Transaction freshness ingest (for-sale + for-rent pages)',
      requestsPerRun: 25,
      runsPerDay: 1,
      runsPerMonth: 30,
      monthlyTotal: 750,
    },
  },

  estimatedMonthlyTotal: 750,

  get estimatedMonthlyRemaining() {
    return this.monthlyLimit - this.estimatedMonthlyTotal
  },
} as const

// ---------------------------------------------------------------------------
// RAPIDAPI BUDGET (700 requests / month on free tier)
// ---------------------------------------------------------------------------

export const RAPIDAPI_BUDGET = {
  monthlyLimit: 700,

  /**
   * Pipelines that consume RapidAPI requests.
   * requestsPerRun = number of API calls made each time the pipeline fires.
   * Each source (PF + Bayut) = 1 request each.
   */
  pipelines: {
    xPostCron: {
      description: 'Distress sales deals for X post generator',
      sources: ['PropertyFinder', 'Bayut'],
      requestsPerRun: 2,
      runsPerDay: 1,
      runsPerMonth: 30,
      monthlyTotal: 60,
    },
    linkedinCron: {
      description: 'Distress deals for LinkedIn post generator',
      sources: ['PropertyFinder', 'Bayut'],
      requestsPerRun: 2,
      runsPerDay: 0,
      runsPerMonth: 12, // 3x/week
      monthlyTotal: 24,
    },
    rentalDrops: {
      description: 'Rental listings for rental drops terminal',
      sources: ['PropertyFinder', 'Bayut'],
      requestsPerRun: 2,
      runsPerDay: 1,
      runsPerMonth: 30,
      monthlyTotal: 60,
    },
    manualTriggers: {
      description: 'Ad-hoc manual triggers and testing',
      sources: ['PropertyFinder', 'Bayut'],
      requestsPerRun: 2,
      runsPerDay: 0,
      runsPerMonth: 10, // estimate
      monthlyTotal: 20,
    },
  },

  /** Estimated total monthly usage across all pipelines */
  estimatedMonthlyTotal: 164,

  /** Remaining budget after estimates */
  get estimatedMonthlyRemaining() {
    return this.monthlyLimit - this.estimatedMonthlyTotal;
  },
} as const;

// ---------------------------------------------------------------------------
// AI MODEL CONFIG
// ---------------------------------------------------------------------------

export const AI_MODELS = {
  /** Primary model for blog generation (best long-form writing quality) */
  blogPrimary: 'claude-sonnet-4-6',
  /** Fallback if Claude hits rate limit */
  blogFallback: 'gemini-2.5-flash',

  /** Primary model for all automated pipelines (X posts, LinkedIn, blog-to-X) */
  pipelinePrimary: 'gemini-2.5-flash',
  /** Fallback for pipeline models */
  pipelineFallback: 'gemini-1.5-flash',
} as const;

// ---------------------------------------------------------------------------
// SANITY API
// ---------------------------------------------------------------------------

export const SANITY_CONFIG = {
  /** Max API version to use */
  apiVersion: '2024-02-24',
  /** Use CDN for read-only public data */
  useCdn: true,
} as const;

// ---------------------------------------------------------------------------
// BUDGET SUMMARY (for reference)
// ---------------------------------------------------------------------------
//
//  RapidAPI — 700 req/month free tier
//  ┌─────────────────────────┬──────────────┬──────────────┐
//  │ Pipeline                │ Runs/month   │ Req/month    │
//  ├─────────────────────────┼──────────────┼──────────────┤
//  │ X Post Cron (1×/day)    │ 30           │ 60           │
//  │ LinkedIn Cron (3×/week) │ 12           │ 24           │
//  │ Rental Drops (1×/day)   │ 30           │ 60           │
//  │ Manual / testing        │ ~10          │ 20           │
//  ├─────────────────────────┼──────────────┼──────────────┤
//  │ TOTAL ESTIMATED         │              │ 164 / 700    │
//  │ REMAINING BUDGET        │              │ 536 / 700    │
//  └─────────────────────────┴──────────────┴──────────────┘
//
//  Before adding a new pipeline:
//  1. Add its entry to RAPIDAPI_BUDGET.pipelines above
//  2. Update estimatedMonthlyTotal
//  3. Confirm remaining budget is comfortable (target: keep >200 as buffer)
