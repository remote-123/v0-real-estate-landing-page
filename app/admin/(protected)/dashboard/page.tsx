import type { Metadata } from "next"
import { sql } from "@/lib/db"
import { Activity, Mail, MessageCircle, FileText, Database, Users } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Admin Dashboard — North Capital DXB",
  robots: { index: false, follow: false },
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("en-US").format(n)
}

function formatDate(d: Date | string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC"
}

interface PanelData {
  distress: {
    total: number
    last_inserted: string | null
    disappeared_24h: number
  } | null
  email: {
    total: number
    active: number
    last_subscribed: string | null
  } | null
  whatsapp: {
    total: number
    last_7d: number
  } | null
  briefing: {
    last_generated: string | null
    total: number
  } | null
  dld: {
    total_rows: number
    latest_date: string | null
  } | null
  users: {
    total: number
    new_7d: number
    active_7d: number
    last_signup: string | null
    google: number
    linkedin: number
    apple: number
  } | null
}

async function fetchPanelData(): Promise<PanelData> {
  const [distress, email, whatsapp, briefing, dld, users] = await Promise.allSettled([
    sql<{ total: string; last_inserted: string | null; disappeared_24h: string }[]>`
      SELECT
        COUNT(*)::integer AS total,
        MAX(first_seen_at)::text AS last_inserted,
        COUNT(*) FILTER (WHERE disappeared_at >= NOW() - INTERVAL '24 hours')::integer AS disappeared_24h
      FROM distress_listings
    `,
    sql<{ total: string; active: string; last_subscribed: string | null }[]>`
      SELECT
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE unsubscribed_at IS NULL)::integer AS active,
        MAX(subscribed_at)::text AS last_subscribed
      FROM email_leads
    `,
    sql<{ total: string; last_7d: string }[]>`
      SELECT
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::integer AS last_7d
      FROM whatsapp_intents
    `,
    sql<{ last_generated: string | null; total: string }[]>`
      SELECT
        MAX(generated_at)::text AS last_generated,
        COUNT(*)::integer AS total
      FROM market_briefings
    `,
    sql<{ total_rows: string; latest_date: string | null }[]>`
      SELECT
        COUNT(*)::integer AS total_rows,
        MAX(instance_date)::text AS latest_date
      FROM dld_transactions
    `,
    sql<{ total: string; new_7d: string; active_7d: string; last_signup: string | null; google: string; linkedin: string; apple: string }[]>`
      SELECT
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::integer AS new_7d,
        COUNT(*) FILTER (WHERE last_seen_at >= NOW() - INTERVAL '7 days')::integer AS active_7d,
        MAX(created_at)::text AS last_signup,
        COUNT(*) FILTER (WHERE provider = 'google')::integer AS google,
        COUNT(*) FILTER (WHERE provider = 'linkedin')::integer AS linkedin,
        COUNT(*) FILTER (WHERE provider = 'apple')::integer AS apple
      FROM users
    `,
  ])

  if (distress.status === "rejected") console.error("[admin] distress_listings:", distress.reason)
  if (email.status === "rejected") console.error("[admin] email_leads:", email.reason)
  if (whatsapp.status === "rejected") console.error("[admin] whatsapp_intents:", whatsapp.reason)
  if (briefing.status === "rejected") console.error("[admin] market_briefings:", briefing.reason)
  if (dld.status === "rejected") console.error("[admin] dld_transactions:", dld.reason)
  if (users.status === "rejected") console.error("[admin] users:", users.reason)

  return {
    distress:
      distress.status === "fulfilled" && distress.value[0]
        ? {
            total: Number(distress.value[0].total),
            last_inserted: distress.value[0].last_inserted,
            disappeared_24h: Number(distress.value[0].disappeared_24h),
          }
        : null,
    email:
      email.status === "fulfilled" && email.value[0]
        ? {
            total: Number(email.value[0].total),
            active: Number(email.value[0].active),
            last_subscribed: email.value[0].last_subscribed,
          }
        : null,
    whatsapp:
      whatsapp.status === "fulfilled" && whatsapp.value[0]
        ? {
            total: Number(whatsapp.value[0].total),
            last_7d: Number(whatsapp.value[0].last_7d),
          }
        : null,
    briefing:
      briefing.status === "fulfilled" && briefing.value[0]
        ? {
            last_generated: briefing.value[0].last_generated,
            total: Number(briefing.value[0].total),
          }
        : null,
    dld:
      dld.status === "fulfilled" && dld.value[0]
        ? {
            total_rows: Number(dld.value[0].total_rows),
            latest_date: dld.value[0].latest_date,
          }
        : null,
    users:
      users.status === "fulfilled" && users.value[0]
        ? {
            total: Number(users.value[0].total),
            new_7d: Number(users.value[0].new_7d),
            active_7d: Number(users.value[0].active_7d),
            last_signup: users.value[0].last_signup,
            google: Number(users.value[0].google),
            linkedin: Number(users.value[0].linkedin),
            apple: Number(users.value[0].apple),
          }
        : null,
  }
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-foreground font-medium">{value}</span>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
  status,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  status?: "ok" | "warn" | "error" | "unknown"
}) {
  const statusColor =
    status === "ok"
      ? "bg-emerald-500"
      : status === "warn"
      ? "bg-yellow-400"
      : status === "error"
      ? "bg-red-500"
      : "bg-muted"

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            {title}
          </h2>
        </div>
        <div className={`h-2 w-2 rounded-full ${statusColor}`} />
      </div>
      <div>{children}</div>
    </div>
  )
}

export default async function AdminDashboardPage() {
  const data = await fetchPanelData()
  const now = new Date().toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " UTC"

  return (
    <div className="min-h-screen bg-background px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Internal
          </p>
          <h1 className="font-serif text-3xl font-bold text-foreground mt-1">Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">As of {now}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Distress Listings */}
          <Panel
            title="Distress Listings"
            icon={Activity}
            status={data.distress ? "ok" : "error"}
          >
            {data.distress ? (
              <>
                <StatRow label="Total rows" value={formatNum(data.distress.total)} />
                <StatRow
                  label="Last inserted"
                  value={formatDate(data.distress.last_inserted)}
                />
                <StatRow
                  label="Disappeared (24h)"
                  value={data.distress.disappeared_24h}
                />
              </>
            ) : (
              <p className="text-xs text-red-400 font-mono">Table unavailable or missing</p>
            )}
          </Panel>

          {/* Email Leads */}
          <Panel
            title="Email Leads"
            icon={Mail}
            status={data.email ? (data.email.total > 0 ? "ok" : "warn") : "error"}
          >
            {data.email ? (
              <>
                <StatRow label="Total" value={formatNum(data.email.total)} />
                <StatRow label="Active (not unsubscribed)" value={formatNum(data.email.active)} />
                <StatRow
                  label="Last subscribed"
                  value={formatDate(data.email.last_subscribed)}
                />
              </>
            ) : (
              <p className="text-xs text-red-400 font-mono">Table unavailable or missing</p>
            )}
          </Panel>

          {/* WhatsApp Intents */}
          <Panel
            title="WhatsApp Intents"
            icon={MessageCircle}
            status={data.whatsapp ? "ok" : "error"}
          >
            {data.whatsapp ? (
              <>
                <StatRow label="Total" value={formatNum(data.whatsapp.total)} />
                <StatRow label="Last 7 days" value={formatNum(data.whatsapp.last_7d)} />
              </>
            ) : (
              <p className="text-xs text-red-400 font-mono">Table unavailable or missing</p>
            )}
          </Panel>

          {/* Market Briefings */}
          <Panel
            title="Market Briefings"
            icon={FileText}
            status={
              data.briefing
                ? data.briefing.total > 0
                  ? "ok"
                  : "warn"
                : "error"
            }
          >
            {data.briefing ? (
              <>
                <StatRow label="Total briefings" value={formatNum(data.briefing.total)} />
                <StatRow
                  label="Last generated"
                  value={formatDate(data.briefing.last_generated)}
                />
              </>
            ) : (
              <p className="text-xs text-red-400 font-mono">Table unavailable or missing</p>
            )}
          </Panel>

          {/* DLD Transactions */}
          <Panel
            title="DLD Transactions"
            icon={Database}
            status={data.dld ? (data.dld.total_rows > 1_000_000 ? "ok" : "warn") : "error"}
          >
            {data.dld ? (
              <>
                <StatRow label="Total rows" value={formatNum(data.dld.total_rows)} />
                <StatRow label="Latest instance_date" value={formatDate(data.dld.latest_date)} />
              </>
            ) : (
              <p className="text-xs text-red-400 font-mono">Table unavailable</p>
            )}
          </Panel>

          {/* Registered Users */}
          <Panel
            title="Registered Users"
            icon={Users}
            status={data.users ? (data.users.total > 0 ? "ok" : "warn") : "error"}
          >
            {data.users ? (
              <>
                <StatRow label="Total" value={formatNum(data.users.total)} />
                <StatRow label="New (7d)" value={data.users.new_7d} />
                <StatRow label="Active (7d)" value={data.users.active_7d} />
                <StatRow label="Last signup" value={formatDate(data.users.last_signup)} />
                <StatRow
                  label="By provider"
                  value={`G:${data.users.google} · LI:${data.users.linkedin} · 🍎:${data.users.apple}`}
                />
              </>
            ) : (
              <p className="text-xs text-red-400 font-mono">Table unavailable or missing</p>
            )}
          </Panel>
        </div>

        <p className="font-mono text-[10px] text-muted-foreground/40">
          Internal admin view — not indexed by search engines.
        </p>
      </div>
    </div>
  )
}
