import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { FileText, ChevronRight } from "lucide-react"
import Link from "next/link"

export const revalidate = 3600

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Weekly Market Briefing",
    description: "Institutional-grade weekly market briefing for Dubai real estate. DLD data-driven analysis covering top areas by volume, distress signals, and price momentum.",
    path: "/terminal/market-briefing",
  })
}

interface Briefing {
  content: string
  generated_at: string
  week_label: string
}

async function fetchLatestBriefing(): Promise<Briefing | null> {
  try {
    const rows = await sql<Briefing[]>`
      SELECT content, generated_at, week_label
      FROM market_briefings
      ORDER BY generated_at DESC
      LIMIT 1
    `
    return rows[0] ?? null
  } catch {
    return null
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
  } catch {
    return iso
  }
}

// Convert newlines to paragraphs for display
function renderContent(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
}

export default async function MarketBriefingPage() {
  const briefing = await fetchLatestBriefing()

  return (
    <div className="space-y-8 pb-24 lg:pb-10 px-6 sm:px-0">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Intelligence</p>
          <Link
            href="/terminal/market-briefing/archive"
            className="text-[10px] font-mono text-accent hover:text-accent/80 transition-colors flex items-center gap-1 uppercase tracking-wider"
          >
            Archive <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Weekly Market Briefing</h1>
        <p className="text-muted-foreground">
          AI-generated institutional analysis from live DLD and Bayut transaction data. Published every Monday 06:00 UTC.
        </p>
      </div>

      {briefing ? (
        <div className="space-y-6">
          {/* Header card */}
          <div className="rounded-xl border border-border/40 bg-card/40 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Week</p>
                <h2 className="text-xl font-semibold text-foreground">{briefing.week_label}</h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Generated</p>
                <p className="text-sm text-muted-foreground">{formatDate(briefing.generated_at)}</p>
              </div>
            </div>
          </div>

          {/* Briefing content */}
          <div className="rounded-xl border border-border/40 bg-card/40 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="rounded-lg bg-accent/10 p-2">
                <FileText className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Institutional Briefing
              </span>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
              {renderContent(briefing.content).map((paragraph, i) => {
                // Section headings — lines that start with all-caps words or specific patterns
                const isHeading = /^[A-Z][A-Z\s:\/]+$/.test(paragraph.trim()) ||
                  paragraph.startsWith('MARKET SNAPSHOT') ||
                  paragraph.startsWith('KEY SIGNALS') ||
                  paragraph.startsWith('BEAR CASE') ||
                  paragraph.startsWith('OPPORTUNITY') ||
                  paragraph.startsWith('---')

                if (paragraph === '---') return <hr key={i} className="border-border/40 my-2" />

                if (isHeading) {
                  return (
                    <h3 key={i} className="text-[10px] uppercase tracking-widest font-semibold text-accent pt-4 first:pt-0">
                      {paragraph}
                    </h3>
                  )
                }

                return (
                  <p key={i} className="text-muted-foreground leading-relaxed">
                    {paragraph}
                  </p>
                )
              })}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl border border-border/40 bg-secondary/20 p-4">
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              This briefing is generated automatically from DLD transaction data using AI analysis. It is for informational purposes only and does not constitute financial advice. Past performance is not indicative of future results.
            </p>
          </div>
        </div>
      ) : (
        /* No briefing yet */
        <div className="rounded-xl border border-border/40 bg-card/40 p-12 flex flex-col items-center justify-center text-center gap-4">
          <div className="rounded-full bg-secondary/50 p-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Briefing Generates Monday 06:00 UTC</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              The weekly market briefing is generated automatically every Monday morning from live DLD and Bayut transaction data. Check back after the next scheduled run.
            </p>
          </div>
          <div className="mt-2 rounded-lg border border-border/40 bg-secondary/30 px-4 py-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Schedule:</span> Monday 06:00 UTC — Market Briefing<br />
            <span className="font-medium text-foreground">Then:</span> Monday 07:00 UTC — Weekly Digest email to subscribers
          </div>
        </div>
      )}
    </div>
  )
}
