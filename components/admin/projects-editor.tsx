'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, X, Save, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Project = {
  project_id: number
  project_name_en: string
  developer_name: string | null
  master_developer_name: string | null
  project_status: string | null
  percent_completed: number | null
  project_start_date: string | null
  project_end_date: string | null
  completion_date: string | null
  area_name_en: string | null
  master_project_en: string | null
  no_of_buildings: number | null
  no_of_units: number | null
}

const STATUS_OPTIONS = ['', 'Completed', 'Under Construction', 'Planning', 'On Hold', 'Cancelled']

export function ProjectsEditor() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Project | null>(null)
  const [edits, setEdits] = useState<Partial<Project>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ q, page: String(page) })
      const res = await fetch(`/api/admin/projects?${params}`)
      const data = await res.json()
      setProjects(data.rows)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [q, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [q])

  function openEditor(p: Project) {
    setSelected(p)
    setEdits({})
    setSaved(false)
  }

  function setField(key: keyof Project, value: string | number | null) {
    setEdits(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    try {
      await fetch('/api/admin/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: selected.project_id, ...edits }),
      })
      setSaved(true)
      const updated = { ...selected, ...edits }
      setProjects(prev => prev.map(p => p.project_id === selected.project_id ? updated as Project : p))
      setSelected(updated as Project)
      setEdits({})
    } finally {
      setSaving(false)
    }
  }

  const LIMIT = 50
  const totalPages = Math.ceil(total / LIMIT)
  const current = selected ? { ...selected, ...edits } : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search project, developer, area…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
          />
        </div>
      </div>

      <p className="text-xs font-mono text-muted-foreground">{total.toLocaleString()} projects</p>

      <div className="flex gap-4">
        {/* Table */}
        <div className={cn('flex-1 min-w-0 rounded-xl border border-border/50 overflow-hidden', selected && 'hidden xl:block')}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase text-muted-foreground">Project</th>
                  <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase text-muted-foreground hidden sm:table-cell">Developer</th>
                  <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase text-muted-foreground hidden md:table-cell">Area</th>
                  <th className="text-right px-3 py-2.5 font-mono text-[10px] uppercase text-muted-foreground hidden lg:table-cell">Units</th>
                  <th className="text-left px-3 py-2.5 font-mono text-[10px] uppercase text-muted-foreground hidden lg:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">Loading…</td></tr>
                ) : projects.map((p, i) => (
                  <tr
                    key={p.project_id}
                    onClick={() => openEditor(p)}
                    className={cn(
                      'border-b border-border/20 cursor-pointer transition-colors hover:bg-accent/5',
                      i % 2 === 0 ? 'bg-card' : 'bg-muted/5',
                      selected?.project_id === p.project_id && 'bg-accent/10'
                    )}
                  >
                    <td className="px-3 py-2.5 font-medium text-foreground truncate max-w-[180px]">{p.project_name_en}</td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell truncate max-w-[140px]">
                      {p.developer_name ?? <span className="text-red-400/60 text-[10px]">missing</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell truncate max-w-[120px]">{p.area_name_en ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono hidden lg:table-cell">{p.no_of_units?.toLocaleString() ?? '—'}</td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className="font-mono text-[10px] text-muted-foreground">{p.project_status ?? '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/10">
              <span className="text-[10px] font-mono text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-accent/10 disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-accent/10 disabled:opacity-30">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Edit panel */}
        {selected && current && (
          <div className="w-full xl:w-80 shrink-0 rounded-xl border border-border/50 bg-card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{current.project_name_en}</p>
                <p className="text-[10px] text-muted-foreground">{current.area_name_en ?? ''}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-muted text-muted-foreground ml-2 shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="rounded-md bg-muted/30 px-3 py-2 space-y-1 text-[10px] font-mono text-muted-foreground">
                <div className="flex justify-between"><span>ID</span><span>{current.project_id}</span></div>
                {current.no_of_buildings && <div className="flex justify-between"><span>Buildings</span><span>{current.no_of_buildings}</span></div>}
                {current.no_of_units && <div className="flex justify-between"><span>Units</span><span>{current.no_of_units.toLocaleString()}</span></div>}
              </div>

              {([
                { key: 'project_name_en', label: 'Project Name' },
                { key: 'developer_name', label: 'Developer' },
                { key: 'master_developer_name', label: 'Master Developer' },
                { key: 'area_name_en', label: 'Area' },
                { key: 'master_project_en', label: 'Master Project' },
                { key: 'completion_date', label: 'Completion Date' },
                { key: 'percent_completed', label: '% Complete', type: 'number' },
              ] as { key: keyof Project; label: string; type?: string }[]).map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</label>
                  <input
                    type={type ?? 'text'}
                    value={current[key] == null ? '' : String(current[key])}
                    onChange={e => {
                      const v = e.target.value
                      setField(key, type === 'number' ? (v === '' ? null : Number(v)) : (v || null))
                    }}
                    className="w-full rounded-md border border-border/50 bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent/50"
                  />
                </div>
              ))}

              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Status</label>
                <select
                  value={current.project_status ?? ''}
                  onChange={e => setField('project_status', e.target.value || null)}
                  className="w-full rounded-md border border-border/50 bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent/50"
                >
                  {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o || '(none)'}</option>)}
                </select>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-border/40 bg-muted/10">
              {saved ? (
                <div className="flex items-center gap-2 text-emerald-400 text-xs">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </div>
              ) : (
                <button
                  onClick={save}
                  disabled={saving || Object.keys(edits).length === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-accent text-accent-foreground py-2 text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving…' : `Save${Object.keys(edits).length > 0 ? ` (${Object.keys(edits).length})` : ''}`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
