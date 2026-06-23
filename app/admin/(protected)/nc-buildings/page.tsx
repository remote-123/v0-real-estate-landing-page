import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import { NcBuildingsAdmin } from '@/components/admin/nc-buildings-table'

export const metadata: Metadata = { title: 'NC Buildings — Admin' }
export const dynamic = 'force-dynamic'

export default async function NcBuildingsPage() {
  const areas = await sql<{ slug: string; display_name: string }[]>`
    SELECT slug, display_name FROM nc_areas ORDER BY display_name
  `

  return <NcBuildingsAdmin areas={areas} />
}
