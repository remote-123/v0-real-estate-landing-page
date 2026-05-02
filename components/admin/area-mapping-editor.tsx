'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Check, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Mapping = { bayut_name: string; dld_name: string }
type EditState = { bayut_name: string; dld_name: string }

export function AreaMappingEditor() {
  const [rows, setRows] = useState<Mapping[]>([])
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState<Record<string, EditState>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [adding, setAdding] = useState(false)
  const [newRow, setNewRow] = useState<EditState>({ bayut_name: '', dld_name: '' })

  useEffect(() => {
    fetch('/api/admin/areas')
      .then(r => r.json())
      .then(data => { setRows(data); setLoading(false) })
  }, [])

  function startEdit(m: Mapping) {
    setEdits(prev => ({ ...prev, [m.bayut_name]: { bayut_name: m.bayut_name, dld_name: m.dld_name } }))
  }

  async function saveEdit(original_key: string) {
    const edit = edits[original_key]
    if (!edit) return
    await fetch('/api/admin/areas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bayut_name: edit.bayut_name, dld_name: edit.dld_name, old_bayut_name: original_key }),
    })
    setRows(prev => prev.map(r => r.bayut_name === original_key ? { bayut_name: edit.bayut_name, dld_name: edit.dld_name } : r))
    setEdits(prev => { const n = { ...prev }; delete n[original_key]; return n })
    setSaved(prev => ({ ...prev, [edit.bayut_name]: true }))
    setTimeout(() => setSaved(prev => { const n = { ...prev }; delete n[edit.bayut_name]; return n }), 2000)
  }

  async function deleteRow(bayut_name: string) {
    if (!confirm(`Delete mapping for "${bayut_name}"?`)) return
    await fetch('/api/admin/areas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bayut_name }),
    })
    setRows(prev => prev.filter(r => r.bayut_name !== bayut_name))
  }

  async function addRow() {
    if (!newRow.bayut_name.trim() || !newRow.dld_name.trim()) return
    await fetch('/api/admin/areas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRow),
    })
    setRows(prev => [...prev, newRow].sort((a, b) => a.bayut_name.localeCompare(b.bayut_name)))
    setNewRow({ bayut_name: '', dld_name: '' })
    setAdding(false)
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-muted-foreground">{rows.length} mappings</p>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-md bg-accent text-accent-foreground px-3 py-1.5 text-xs font-medium hover:bg-accent/90"
        >
          <Plus className="h-3.5 w-3.5" /> Add mapping
        </button>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b border-border/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase text-muted-foreground">Bayut Name</th>
              <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase text-muted-foreground">DLD Name</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {/* Add new row */}
            {adding && (
              <tr className="border-b border-border/50 bg-accent/5">
                <td className="px-3 py-2">
                  <input
                    autoFocus
                    value={newRow.bayut_name}
                    onChange={e => setNewRow(p => ({ ...p, bayut_name: e.target.value }))}
                    placeholder="Bayut area name…"
                    className="w-full rounded border border-accent/40 bg-background px-2 py-1 text-xs focus:outline-none focus:border-accent"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={newRow.dld_name}
                    onChange={e => setNewRow(p => ({ ...p, dld_name: e.target.value }))}
                    placeholder="DLD area name…"
                    className="w-full rounded border border-accent/40 bg-background px-2 py-1 text-xs focus:outline-none focus:border-accent"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={addRow} className="rounded p-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setAdding(false)} className="rounded p-1 hover:bg-muted text-muted-foreground">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {rows.map((row, i) => {
              const edit = edits[row.bayut_name]
              const isSaved = saved[row.bayut_name]
              return (
                <tr key={row.bayut_name} className={cn('border-b border-border/20 hover:bg-muted/20', i % 2 === 0 ? 'bg-card' : 'bg-muted/5')}>
                  <td className="px-3 py-2">
                    {edit ? (
                      <input
                        value={edit.bayut_name}
                        onChange={e => setEdits(p => ({ ...p, [row.bayut_name]: { ...p[row.bayut_name], bayut_name: e.target.value } }))}
                        className="w-full rounded border border-border/50 bg-background px-2 py-1 text-xs focus:outline-none focus:border-accent"
                      />
                    ) : (
                      <span
                        onClick={() => startEdit(row)}
                        className={cn('cursor-text text-foreground hover:text-accent', isSaved && 'text-emerald-400')}
                      >
                        {row.bayut_name}
                        {isSaved && <Check className="inline ml-1 h-3 w-3" />}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {edit ? (
                      <input
                        value={edit.dld_name}
                        onChange={e => setEdits(p => ({ ...p, [row.bayut_name]: { ...p[row.bayut_name], dld_name: e.target.value } }))}
                        className="w-full rounded border border-border/50 bg-background px-2 py-1 text-xs focus:outline-none focus:border-accent"
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} className="cursor-text text-muted-foreground hover:text-foreground">
                        {row.dld_name}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      {edit ? (
                        <button onClick={() => saveEdit(row.bayut_name)} className="rounded p-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                          <Save className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      <button onClick={() => deleteRow(row.bayut_name)} className="rounded p-1 hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
        <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Changes take effect immediately. Wrong mappings will silently break yield calculations and rental data joins across all terminal pages.
        </p>
      </div>
    </div>
  )
}
