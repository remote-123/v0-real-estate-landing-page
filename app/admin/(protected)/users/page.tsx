import type { Metadata } from "next"
import { sql } from "@/lib/db"
import { Users, UserCheck, TrendingUp } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Users — Admin — North Capital DXB",
  robots: { index: false, follow: false },
}

function formatRelative(date: Date | string | null): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  const diffMs = Date.now() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 60) return "just now"
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`
  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("en-US").format(n)
}

interface UserRow {
  id: string
  name: string | null
  email: string | null
  provider: string | null
  created_at: string | null
  last_seen_at: string | null
  sign_in_count: string | null
}

interface Stats {
  total: number
  google: number
  linkedin: number
  apple: number
  today: number
  this_week: number
  total_sign_ins: number
}

async function fetchData(): Promise<{ users: UserRow[]; stats: Stats | null }> {
  const [usersResult, statsResult] = await Promise.allSettled([
    sql<UserRow[]>`
      SELECT
        id,
        name,
        email,
        provider,
        created_at::text AS created_at,
        last_seen_at::text AS last_seen_at,
        sign_in_count
      FROM users_legacy
      ORDER BY created_at DESC
      LIMIT 200
    `,
    sql<{ total: string; google: string; linkedin: string; apple: string; today: string; this_week: string; total_sign_ins: string }[]>`
      SELECT
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE provider = 'google')::integer AS google,
        COUNT(*) FILTER (WHERE provider = 'linkedin')::integer AS linkedin,
        COUNT(*) FILTER (WHERE provider = 'apple')::integer AS apple,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::integer AS today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::integer AS this_week,
        COALESCE(SUM(sign_in_count), 0)::integer AS total_sign_ins
      FROM users_legacy
    `,
  ])

  if (usersResult.status === "rejected") console.error("[admin/users] fetch users:", usersResult.reason)
  if (statsResult.status === "rejected") console.error("[admin/users] fetch stats:", statsResult.reason)

  const users = usersResult.status === "fulfilled" ? usersResult.value : []
  const statsRow = statsResult.status === "fulfilled" && statsResult.value[0] ? statsResult.value[0] : null
  const stats: Stats | null = statsRow
    ? {
        total: Number(statsRow.total),
        google: Number(statsRow.google),
        linkedin: Number(statsRow.linkedin),
        apple: Number(statsRow.apple),
        today: Number(statsRow.today),
        this_week: Number(statsRow.this_week),
        total_sign_ins: Number(statsRow.total_sign_ins),
      }
    : null

  return { users, stats }
}

function ProviderBadge({ provider }: { provider: string | null }) {
  if (!provider) return <span className="font-mono text-[10px] text-muted-foreground">—</span>

  const styles: Record<string, string> = {
    google: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    linkedin: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    apple: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  }

  const style = styles[provider.toLowerCase()] ?? "bg-muted/40 text-muted-foreground border-border/30"
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${style}`}>
      {provider}
    </span>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string
  value: string | number
  icon?: React.ElementType
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
      </div>
      <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground font-mono">{sub}</p>}
    </div>
  )
}

export default async function AdminUsersPage() {
  const { users, stats } = await fetchData()

  return (
    <div className="min-h-screen bg-background px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Internal</p>
          <h1 className="font-serif text-3xl font-bold text-foreground mt-1">Registered Users</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">Last 200 sign-ups, newest first</p>
        </div>

        {/* Stats grid */}
        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            <StatCard label="Total users" value={formatNum(stats.total)} icon={Users} />
            <StatCard
              label="By provider"
              value={`G:${stats.google} · LI:${stats.linkedin} · A:${stats.apple}`}
              icon={UserCheck}
            />
            <StatCard label="Sign-ups today" value={stats.today} icon={TrendingUp} sub={`${stats.this_week} this week`} />
            <StatCard label="Total sign-ins" value={formatNum(stats.total_sign_ins)} />
          </div>
        ) : (
          <p className="text-xs text-red-400 font-mono">Could not load stats — users table may be unavailable</p>
        )}

        {/* Table */}
        <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              User list ({users.length})
            </h2>
          </div>

          {users.length === 0 ? (
            <p className="px-5 py-8 text-xs text-muted-foreground font-mono">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/20">
                    <th className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 w-8">#</th>
                    <th className="px-3 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Name</th>
                    <th className="px-3 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Email</th>
                    <th className="px-3 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Provider</th>
                    <th className="px-3 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Sign-ins</th>
                    <th className="px-3 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">First seen</th>
                    <th className="px-3 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/10 last:border-0 hover:bg-accent/5 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-muted-foreground/40">{idx + 1}</td>
                      <td className="px-3 py-3 text-foreground font-medium truncate max-w-[140px]">
                        {user.name ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-3 font-mono text-muted-foreground truncate max-w-[180px]">
                        {user.email ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <ProviderBadge provider={user.provider} />
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-foreground">
                        {user.sign_in_count != null ? Number(user.sign_in_count) : "—"}
                      </td>
                      <td className="px-3 py-3 font-mono text-muted-foreground whitespace-nowrap">
                        {formatRelative(user.created_at)}
                      </td>
                      <td className="px-3 py-3 font-mono text-muted-foreground whitespace-nowrap">
                        {formatRelative(user.last_seen_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="font-mono text-[10px] text-muted-foreground/40">
          Internal admin view — not indexed by search engines.
        </p>
      </div>
    </div>
  )
}
