'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, X, Save, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Building = {
  building_id: number
  global_slug: string
  building_name_en: string
  area_name_en: string | null
  developer_name: string | null
  completion_year: number | null
  propsearch_status: string | null
  total_floors: number | null
  total_units: number | null
  property_types: string | null
  registry_property_id: string | null
  registry_match_method: string | null
  primary_sub_type: string | null
  is_free_hold: boolean | null
  data_source: string
  txn_count: number | null
  avg_psf: string | null
}

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'fuzzy',    label: 'Fuzzy Match', desc: 'Review AI matches' },
  { key: 'no_data',  label: 'No Data', desc: 'Missing units/floors/dev' },
  { key: 'no_reg',   label: 'No Registry', desc: 'Unmatched buildings' },
  { key: 'registry', label: 'Registry-only', desc: 'No transactions' },
]

const STATUS_OPTIONS = ['complete', 'under_construction', 'planned', 'cancelled', '']

function MatchBadge({ method }: { method: string | null }) {
  if (!method) return <span className="font-mono text-[10px] text-muted-foreground/30">—</span>
  const cfg =
    method === 'exact' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
    method === 'fuzzy' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' :
    'bg-muted/50 text-muted-foreground border-border/40'
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold', cfg)}>
      {method}
    </span>
  )
}

function EditField({
  label, value, onChange, type = 'text', options,
}: {
  label: string
  value: string | number | boolean | null
  onChange: (v: string | number | boolean | null) => void
  type?: 'text' | 'number' | 'select' | 'boolean'
  options?: string[]
}) {
  const strVal = value == null ? '' : String(value)

  if (type === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <button
          onClick={() => onChange(value === true ? false : true)}
          className={cn(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
            value ? 'bg-emerald-500' : 'bg-border'
          )}
        >
          <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', value ? 'translate-x-4.5' : 'translate-x-1')} />
        </button>
      </div>
    )
  }

  if (type === 'select' && options) {
    return (
      <div>
        <label className="block text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</label>
        <select
          value={strVal}
          onChange={e => onChange(e.target.value || null)}
          className="w-full rounded-md border border-border/50 bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent/50"
        >
          {options.map(o => <option key={o} value={o}>{o || '(none)'}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</label>
      <input
        type={type}
        value={strVal}
        onChange={e => {
          const v = e.target.value
          if (type === 'number') onChange(v === '' ? null : Number(v))
          else onChange(v || null)
        }}
        className="w-full rounded-md border border-border/50 bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent/50"
      />
    </div>
  )
}

export function BuildingsEditor() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Building | null>(null)
  const [edits, setEdits] = useState<Partial<Building>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ q, filter, page: String(page) })
      const res = await fetch(`/api/admin/buildings?${params}`)
      const data = await res.json()
      setBuildings(data.rows)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [q, filter, page])

  useEffect(() => { load() }, [load])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load() }, 400)
    return () => clearTimeout(t)
  }, [q]) // eslint-disable-line

  function openEditor(b: Building) {
    setSelected(b)
    setEdits({})
    setSaved(false)
  }

  function setField(key: keyof Building, value: string | number | boolean | null) {
    setEdits(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    try {
      await fetch('/api/admin/buildings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ building_id: selected.building_id, ...edits }),
      })
      setSaved(true)
      // Update local list
      const updated = { ...selected, ...edits }
      setBuildings(prev => prev.map(b => b.building_id === selected.building_id ? updated as Building : b))
      setSelected(updated as Building)
    } finally {
      setSaving(false)
    }
  }

  const LIMIT = 50
  const totalPages = Math.ceil(total / LIMIT)
  const current = selected ? { ...selected, ...edits } : null

  return (
    <div className="flex flex-col gap-4">
      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search name or area..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1) }}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors whitespace-nowrap',
                filter === f.key
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground'
              )}
              title={f.desc}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs font-mono text-muted-foreground">{total.toLocaleString()} buildings</p>

      {/* Table + edit panel */}
      <div className="flex gap-4">
        {/* Table */}
        <div className={cn('flex-1 min-w-0 rounded-xl border border-border/50 overflow-hidden', selected && 'hidden xl:block')}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase text-muted-foreground">Building</th>
                  <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase text-muted-foreground">Area</th>
                  <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase text-muted-foreground hidden sm:table-cell">Developer</th>
                  <th className="text-right px-3 py-2.5 font-mono text-[10px] uppercase text-muted-foreground hidden md:table-cell">Units</th>
                  <th className="text-right px-3 py-2.5 font-mono text-[10px] uppercase text-muted-foreground hidden md:table-cell">Floors</th>
                  <th className="text-center px-3 py-2.5 font-mono text-[10px] uppercase text-muted-foreground hidden lg:table-cell">Match</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">Loading...</td></tr>
                ) : buildings.map((b, i) => (
                  <tr
                    key={b.building_id}
                    onClick={() => openEditor(b)}
                    className={cn(
                      'border-b border-border/20 cursor-pointer transition-colors hover:bg-accent/5',
                      i % 2 === 0 ? 'bg-card' : 'bg-muted/5',
                      selected?.building_id === b.building_id && 'bg-accent/10 ring-1 ring-inset ring-accent/20'
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {!b.registry_property_id && (
                          <AlertTriangle className="h-3 w-3 text-yellow-400/60 shrink-0" />
                        )}
                        <span className="font-medium text-foreground truncate max-w-[180px]">{b.building_name_en}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[120px]">{b.area_name_en ?? '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell truncate max-w-[140px]">{b.developer_name ?? <span className="text-muted-foreground/30">—</span>}</td>
                    <td className="px-3 py-2.5 text-right font-mono hidden md:table-cell">{b.total_units ?? <span className="text-muted-foreground/30">—</span>}</td>
                    <td className="px-3 py-2.5 text-right font-mono hidden md:table-cell">{b.total_floors ?? <span className="text-muted-foreground/30">—</span>}</td>
                    <td className="px-3 py-2.5 text-center hidden lg:table-cell">
                      <MatchBadge method={b.registry_match_method} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/10">
              <span className="text-[10px] font-mono text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded hover:bg-accent/10 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded hover:bg-accent/10 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Edit panel */}
        {selected && current && (
          <div className="w-full xl:w-80 shrink-0 rounded-xl border border-border/50 bg-card overflow-hidden flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{current.building_name_en}</p>
                <p className="text-[10px] text-muted-foreground">{current.area_name_en ?? ''}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/terminal/buildings/${current.global_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-accent"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Meta */}
              <div className="rounded-md bg-muted/30 px-3 py-2 space-y-1 text-[10px] font-mono text-muted-foreground">
                <div className="flex justify-between">
                  <span>Match</span>
                  <MatchBadge method={current.registry_match_method} />
                </div>
                <div className="flex justify-between">
                  <span>Source</span>
                  <span className="text-foreground">{current.data_source}</span>
                </div>
                {current.txn_count && (
                  <div className="flex justify-between">
                    <span>Transactions</span>
                    <span className="text-foreground">{current.txn_count.toLocaleString()}</span>
                  </div>
                )}
                {current.avg_psf && (
                  <div className="flex justify-between">
                    <span>Avg PSF</span>
                    <span className="text-foreground">AED {Number(current.avg_psf).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <EditField label="Building Name" value={current.building_name_en} onChange={v => setField('building_name_en', v)} />
              <EditField label="Area" value={current.area_name_en} onChange={v => setField('area_name_en', v)} />
              <EditField label="Developer" value={current.developer_name} onChange={v => setField('developer_name', v)} />
              <EditField label="Completion Year" value={current.completion_year} onChange={v => setField('completion_year', v)} type="number" />
              <EditField label="Total Floors" value={current.total_floors} onChange={v => setField('total_floors', v)} type="number" />
              <EditField label="Total Units" value={current.total_units} onChange={v => setField('total_units', v)} type="number" />
              <EditField label="Property Types" value={current.property_types} onChange={v => setField('property_types', v)} />
              <EditField label="Primary Type" value={current.primary_sub_type} onChange={v => setField('primary_sub_type', v)} />
              <EditField
                label="Status"
                value={current.propsearch_status}
                onChange={v => setField('propsearch_status', v)}
                type="select"
                options={STATUS_OPTIONS}
              />
              <EditField label="Freehold" value={current.is_free_hold} onChange={v => setField('is_free_hold', v)} type="boolean" />
            </div>

            {/* Save button */}
            <div className="px-4 py-3 border-t border-border/40 bg-muted/10">
              {saved && Object.keys(edits).length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-400 text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved
                </div>
              ) : (
                <button
                  onClick={save}
                  disabled={saving || Object.keys(edits).length === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-accent text-accent-foreground py-2 text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving…' : `Save ${Object.keys(edits).length > 0 ? `(${Object.keys(edits).length})` : ''}`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
