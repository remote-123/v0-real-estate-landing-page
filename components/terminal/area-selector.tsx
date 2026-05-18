'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { MapPin } from 'lucide-react'

interface Props {
  areas: string[]
  selected: string | null
}

export function AreaSelector({ areas, selected }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val) {
      params.set('area', val)
    } else {
      params.delete('area')
    }
    router.push(`/terminal/buildings?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="relative flex items-center gap-2">
      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <select
        value={selected ?? ''}
        onChange={handleChange}
        className="bg-card border border-border/50 rounded-lg text-sm text-foreground px-3 py-2 pr-8 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 min-w-[220px] appearance-none cursor-pointer"
      >
        <option value="">All areas</option>
        {areas.map(a => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  )
}
