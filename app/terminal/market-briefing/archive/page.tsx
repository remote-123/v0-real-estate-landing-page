import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { FileText, ChevronRight } from "lucide-react"
import Link from "next/link"
import { auth } from "@/auth"
import { GatedTableOverlay } from "@/components/auth/gated-table-overlay"
import { isTerminalUnlocked } from "@/lib/terminal-gate"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Market Briefing Archive",
    description: "All weekly AI-generated Dubai real estate market briefings — institutional analysis from live DLD transaction data.",
    path: "/terminal/market-briefing/archive",
  })
}

interface BriefingSummary {
  id: number
  week_label: string
  generated_at: string
  excerpt: string
}

async function fetchBriefings(): Promise<BriefingSummary[]> {
  try {
    const rows = await sql<{ id: number; week_label: string; generated_at: string; content: string }[]>`
      SELECT id, week_label, generated_at, content
      FROM market_briefings
      ORDER BY generated_at DESC
      LIMIT 52
    `
    return rows.map((r) => ({
      id: Number(r.id),
      week_label: r.week_label,
      generated_at: String(r.generated_at),
      // First 200 chars of content as excerpt, ending at a word boundary
      excerpt: r.content.slice(0, 200).replace(/\s\S*$/, "") + "…",
    }))
  } catch {
    return []
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })
  } catch {
    return iso
  }
}

const FREE_ROWS = 3

export default async function MarketBriefingArchivePage() {
  const [session, briefings] = await Promise.all([auth(), fetchBriefings()])
  const isAuthenticated = await isTerminalUnlocked(session)
  const display = isAuthenticated ? briefings : briefings.slice(0, FREE_ROWS)

  return (
    <div className="space-y-6 pb-24 lg:pb-10 px-6 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link href="/terminal/market-briefing" className="hover:text-foreground transition-colors">
            Market Briefing
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span>Archive</span>
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Briefing Archive</h1>
        <p className="text-muted-foreground text-sm max-w-xl">
          All weekly market briefings — institutional-grade analysis from live DLD and Bayut data.
          Published every Monday 06:00 UTC.
        </p>
      </div>

      {briefings.length === 0 ? (
        <div className="rounded-xl border border-border/40 bg-card/40 p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="rounded-full bg-secondary/50 p-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No briefings published yet — check back Monday.</p>
        </div>
      ) : (
        <div className="relative space-y-3">
          {display.map((b) => (
            <Link
              key={b.id}
              href="/terminal/market-briefing"
              className="block rounded-xl border border-border/40 bg-card/40 p-5 hover:bg-card/70 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="rounded-md bg-accent/10 p-1.5">
                      <FileText className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">{b.week_label}</p>
                    <span className="text-[10px] text-muted-foreground/60 font-mono ml-auto">
                      {formatDate(b.generated_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {b.excerpt}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground shrink-0 mt-1 transition-colors" />
              </div>
            </Link>
          ))}

          {!isAuthenticated && briefings.length > FREE_ROWS && (
            <GatedTableOverlay
              freeRows={display.length}
              totalRows={briefings.length}
              noun="briefings"
              callbackUrl="/terminal/market-briefing/archive"
            />
          )}
        </div>
      )}

      <p className="text-[11px] font-mono text-muted-foreground/40">
        Briefings generated every Monday 06:00 UTC · AI analysis from DLD + Bayut transaction data
      </p>
    </div>
  )
}
