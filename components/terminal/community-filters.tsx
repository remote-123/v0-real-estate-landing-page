'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { cn } from '@/lib/utils'

type TypeFilter = 'flat' | 'villa'

interface Props {
  selectedType: TypeFilter
}

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'villa', label: 'Villa' },
]

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-md font-mono text-[11px] uppercase tracking-wide transition-colors',
        active
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
          : 'text-muted-foreground border border-border/50 hover:border-border hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

export function CommunityFilters({ selectedType }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setType = useCallback(
    (type: TypeFilter) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('type', type)
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest">Type</span>
      <div className="flex gap-1.5">
        {TYPE_OPTIONS.map(opt => (
          <Pill key={opt.value} active={selectedType === opt.value} onClick={() => setType(opt.value)}>
            {opt.label}
          </Pill>
        ))}
      </div>
    </div>
  )
}
