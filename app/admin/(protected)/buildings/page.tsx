import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import { BuildingsEditor } from '@/components/admin/buildings-editor'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Buildings — Admin',
  robots: { index: false, follow: false },
}

export default async function AdminBuildingsPage() {
  const stats = await sql<{ total: string; with_units: string; fuzzy: string; no_reg: string; registry_source: string }[]>`
    SELECT
      COUNT(*)                                                        AS total,
      COUNT(*) FILTER (WHERE total_units IS NOT NULL)                 AS with_units,
      COUNT(*) FILTER (WHERE registry_match_method = 'fuzzy')        AS fuzzy,
      COUNT(*) FILTER (WHERE registry_property_id IS NULL)           AS no_reg,
      COUNT(*) FILTER (WHERE data_source = 'dld_registry')           AS registry_source
    FROM re_buildings
  `
  const s = stats[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Buildings Registry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review data quality, fix names, fill missing fields.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: Number(s.total).toLocaleString(), color: 'text-foreground' },
          { label: 'With Units', value: Number(s.with_units).toLocaleString(), color: 'text-emerald-400' },
          { label: 'Fuzzy Match', value: Number(s.fuzzy).toLocaleString(), color: 'text-yellow-400' },
          { label: 'No Registry', value: Number(s.no_reg).toLocaleString(), color: 'text-red-400' },
          { label: 'Registry-only', value: Number(s.registry_source).toLocaleString(), color: 'text-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border border-border/50 bg-card p-3">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            <p className={`font-mono text-lg font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <BuildingsEditor />
    </div>
  )
}
