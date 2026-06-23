'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'complete',           label: 'Complete' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'planned',            label: 'Planned' },
]

const GRADE_OPTIONS = [
  { value: 'luxury',     label: 'Luxury' },
  { value: 'premium',    label: 'Premium' },
  { value: 'mid',        label: 'Mid' },
  { value: 'affordable', label: 'Affordable' },
]

const TYPE_OPTIONS = [
  { value: 'apartment',       label: 'Apartment' },
  { value: 'hotel-apartment', label: 'Hotel-Apt' },
  { value: 'mixed',           label: 'Mixed Use' },
]

interface Props {
  activeFilters: {
    status: string
    grade: string
    type: string
    freehold: string
    yearFrom: string
    yearTo: string
  }
  activeCount: number
}

export function BuildingsFilters({ activeFilters, activeCount }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // reset to page 1 on filter change
    router.push(`/terminal/buildings?${params.toString()}`)
  }, [router, searchParams])

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('status')
    params.delete('grade')
    params.delete('type')
    params.delete('freehold')
    params.delete('year_from')
    params.delete('year_to')
    params.delete('page')
    router.push(`/terminal/buildings?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(v => !v)}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
            open || activeCount > 0
              ? 'border-accent/50 bg-accent/10 text-accent'
              : 'border-border/50 bg-card text-muted-foreground hover:text-foreground hover:border-border'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold h-4 min-w-[16px] px-1">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 w-[480px] max-w-[calc(100vw-2rem)] rounded-xl border border-border/60 bg-card shadow-xl p-5 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between -mb-1">
            <p className="text-xs font-semibold text-foreground">Filters</p>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close filters"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Status */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => update('status', activeFilters.status === o.value ? '' : o.value)}
                  className={cn(
                    'rounded-md border px-3 py-1 text-xs font-medium transition-colors',
                    activeFilters.status === o.value
                      ? 'border-accent/50 bg-accent/10 text-accent'
                      : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grade */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Grade</p>
            <div className="flex flex-wrap gap-2">
              {GRADE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => update('grade', activeFilters.grade === o.value ? '' : o.value)}
                  className={cn(
                    'rounded-md border px-3 py-1 text-xs font-medium transition-colors capitalize',
                    activeFilters.grade === o.value
                      ? 'border-accent/50 bg-accent/10 text-accent'
                      : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Type</p>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => update('type', activeFilters.type === o.value ? '' : o.value)}
                  className={cn(
                    'rounded-md border px-3 py-1 text-xs font-medium transition-colors',
                    activeFilters.type === o.value
                      ? 'border-accent/50 bg-accent/10 text-accent'
                      : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Completion year */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Completion Year</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1990}
                max={2035}
                placeholder="From"
                value={activeFilters.yearFrom}
                onChange={e => update('year_from', e.target.value)}
                className="w-24 rounded-md border border-border/50 bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
              <span className="text-muted-foreground text-xs">—</span>
              <input
                type="number"
                min={1990}
                max={2035}
                placeholder="To"
                value={activeFilters.yearTo}
                onChange={e => update('year_to', e.target.value)}
                className="w-24 rounded-md border border-border/50 bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>
          </div>

          {/* Freehold toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <p className="text-sm text-foreground">Freehold only</p>
            <button
              onClick={() => update('freehold', activeFilters.freehold === 'true' ? '' : 'true')}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                activeFilters.freehold === 'true' ? 'bg-accent' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  activeFilters.freehold === 'true' ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
