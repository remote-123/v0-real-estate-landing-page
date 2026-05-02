import type { Metadata } from 'next'
import { AreaMappingEditor } from '@/components/admin/area-mapping-editor'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Area Mapping — Admin',
  robots: { index: false, follow: false },
}

export default function AdminAreasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Area Name Mapping</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Maps Bayut area names → DLD area names. Used for all yield calculations and rental data joins. Wrong mappings silently break yield data.
        </p>
      </div>
      <AreaMappingEditor />
    </div>
  )
}
