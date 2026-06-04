import { notFound } from "next/navigation"
import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { unstable_cache } from 'next/cache'
import { FileText, ChevronRight, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { auth } from "@/auth"
import { isTerminalUnlocked } from "@/lib/terminal-gate"
import { GatedTableOverlay } from "@/components/auth/gated-table-overlay"

export const dynamic = "force-dynamic"

interface Briefing {
  id: number
  content: string
  generated_at: string
  week_label: string
  data_snapshot: Record<string, unknown> | null
}

interface NavLinks {
  prev: { id: number; week_label: string } | null
  next: { id: number; week_label: string } | null
}

const fetchBriefing = unstable_cache(
  async (id: number): Promise<{ briefing: Briefing | null; nav: NavLinks }> => {
    try {
      const [rows, prevRows, nextRows] = await Promise.all([
        sql<Briefing[]>`
          SELECT id, content, generated_at, week_label, data_snapshot
          FROM market_briefings WHERE id = ${id}
        `,
        sql<{ id: number; week_label: string }[]>`
          SELECT id, week_label FROM market_briefings
          WHERE id < ${id} ORDER BY id DESC LIMIT 1
        `,
        sql<{ id: number; week_label: string }[]>`
          SELECT id, week_label FROM market_briefings
          WHERE id > ${id} ORDER BY id ASC LIMIT 1
        `,
      ])

      return {
        briefing: rows[0]
          ? { ...rows[0], id: Number(rows[0].id) }
          : null,
        nav: {
          prev: prevRows[0] ? { id: Number(prevRows[0].id), week_label: prevRows[0].week_label } : null,
          next: nextRows[0] ? { id: Number(nextRows[0].id), week_label: nextRows[0].week_label } : null,
        },
      }
    } catch {
      return { briefing: null, nav: { prev: null, next: null } }
    }
  },
  ['market-briefing'],
  { revalidate: 3600 }
)

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { briefing } = await fetchBriefing(Number(id))
  if (!briefing) return terminalPageMeta({ title: "Market Briefing", description: "", path: "/terminal/market-briefing" })
  return terminalPageMeta({
    title: `Market Briefing — ${briefing.week_label}`,
    description: `Institutional-grade weekly Dubai real estate analysis for ${briefing.week_label}. DLD transaction data, distress signals, and price momentum.`,
    path: `/terminal/market-briefing/${id}`,
  })
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

function renderContent(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export default async function BriefingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isInteger(id) || id < 1) notFound()

  const [session, { briefing, nav }] = await Promise.all([auth(), fetchBriefing(id)])
  if (!briefing) notFound()

  const isAuthenticated = await isTerminalUnlocked(session)

  return (
    <div className="space-y-6 pb-24 lg:pb-10 px-6 sm:px-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Link href="/terminal/market-briefing" className="hover:text-foreground transition-colors">
          Market Briefing
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/terminal/market-briefing/archive" className="hover:text-foreground transition-colors">
          Archive
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground/60">{briefing.week_label}</span>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Week</p>
            <h1 className="text-xl font-semibold text-foreground">{briefing.week_label}</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Generated</p>
            <p className="text-sm text-muted-foreground">{formatDate(briefing.generated_at)}</p>
          </div>
        </div>
      </div>

      {/* Briefing content — gated */}
      <div className="relative">
        <div className={!isAuthenticated ? "blur-sm pointer-events-none select-none" : ""}>
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
                const isHeading =
                  /^[A-Z][A-Z\s:\/]+$/.test(paragraph.trim()) ||
                  paragraph.startsWith("MARKET SNAPSHOT") ||
                  paragraph.startsWith("KEY SIGNALS") ||
                  paragraph.startsWith("BEAR CASE") ||
                  paragraph.startsWith("OPPORTUNITY") ||
                  paragraph.startsWith("---")

                if (paragraph === "---") return <hr key={i} className="border-border/40 my-2" />

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
        </div>

        {!isAuthenticated && (
          <GatedTableOverlay
            freeRows={0}
            totalRows={1}
            noun="briefings"
            callbackUrl={`/terminal/market-briefing/${briefing.id}`}
          />
        )}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-border/40 bg-secondary/20 p-4">
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
          This briefing is generated automatically from DLD transaction data using AI analysis. It is for informational purposes only and does not constitute financial advice. Past performance is not indicative of future results.
        </p>
      </div>

      {/* Prev / Next navigation */}
      {(nav.prev || nav.next) && (
        <div className="flex items-center justify-between gap-4">
          {nav.prev ? (
            <Link
              href={`/terminal/market-briefing/${nav.prev.id}`}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{nav.prev.week_label}</span>
            </Link>
          ) : <span />}
          {nav.next ? (
            <Link
              href={`/terminal/market-briefing/${nav.next.id}`}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              <span>{nav.next.week_label}</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : <span />}
        </div>
      )}
    </div>
  )
}
