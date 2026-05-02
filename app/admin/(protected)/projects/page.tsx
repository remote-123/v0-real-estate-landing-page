import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import { ProjectsEditor } from '@/components/admin/projects-editor'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Projects — Admin',
  robots: { index: false, follow: false },
}

export default async function AdminProjectsPage() {
  const stats = await sql<{ total: string; no_developer: string; no_completion: string; in_progress: string }[]>`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE developer_name IS NULL OR developer_name = '') AS no_developer,
      COUNT(*) FILTER (WHERE completion_date IS NULL) AS no_completion,
      COUNT(*) FILTER (WHERE project_status ILIKE '%progress%' OR project_status ILIKE '%construction%') AS in_progress
    FROM dld_projects
  `
  const s = stats[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">DLD Projects</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Developer names and completion dates power building profile pages.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: Number(s.total).toLocaleString(), color: 'text-foreground' },
          { label: 'No Developer', value: Number(s.no_developer).toLocaleString(), color: 'text-red-400' },
          { label: 'No Completion', value: Number(s.no_completion).toLocaleString(), color: 'text-yellow-400' },
          { label: 'In Progress', value: Number(s.in_progress).toLocaleString(), color: 'text-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border border-border/50 bg-card p-3">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            <p className={`font-mono text-lg font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <ProjectsEditor />
    </div>
  )
}
