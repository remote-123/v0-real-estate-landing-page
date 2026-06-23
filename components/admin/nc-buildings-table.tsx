"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"

// ── Types ────────────────────────────────────────────────────────────────────

type NcBuilding = {
  slug: string
  name: string
  nc_area_slug: string | null
  building_type: string | null
  building_grade: string | null
  status: string | null
  developer: string | null
  completion_year: number | null
  total_floors: number | null
  total_units: number | null
  units_studio: number | null
  units_1br: number | null
  units_2br: number | null
  units_3br_plus: number | null
  nearest_highway: string | null
  nearest_metro: string | null
  metro_walk_mins: number | null
  view_type: string[] | null
  has_pool: boolean | null
  has_gym: boolean | null
  has_school_nearby: boolean | null
  is_freehold: boolean | null
  service_charge_psf: number | null
  data_quality: number
  notes: string | null
  updated_at: string
}

type Area = { slug: string; display_name: string }

type ApiResponse = {
  rows: NcBuilding[]
  total: number
  page: number
  pages: number
}

// ── Constants ────────────────────────────────────────────────────────────────

const TOTAL_BUILDINGS = 5799

const HIGHWAYS = ["E11", "E311", "E611", "D63", "SZR", "Sheikh Zayed Road", "Other"]
const VIEW_OPTIONS = ["sea", "marina", "park", "golf", "city", "community", "pool view"]
const GRADES = ["luxury", "premium", "mid", "affordable"]
const BUILDING_TYPES = ["apartment", "villa", "mixed", "hotel-apartment"]

// ── Quality badge ─────────────────────────────────────────────────────────────

function QualityBadge({ quality }: { quality: number }) {
  if (quality === 3) return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
      verified
    </span>
  )
  if (quality === 2) return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30">
      bedrooms
    </span>
  )
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-zinc-700/60 text-zinc-400 ring-1 ring-zinc-600/40">
      auto
    </span>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

type EditFormState = {
  units_studio: string
  units_1br: string
  units_2br: string
  units_3br_plus: string
  building_grade: string
  building_type: string
  nearest_highway: string
  highway_other: string
  view_type: string[]
  has_pool: boolean
  has_gym: boolean
  has_school_nearby: boolean
  completion_year: string
  total_floors: string
  notes: string
}

function buildingToForm(b: NcBuilding): EditFormState {
  const hw = b.nearest_highway ?? ""
  const isOther = hw !== "" && !HIGHWAYS.slice(0, -1).includes(hw)
  return {
    units_studio: b.units_studio != null ? String(b.units_studio) : "",
    units_1br: b.units_1br != null ? String(b.units_1br) : "",
    units_2br: b.units_2br != null ? String(b.units_2br) : "",
    units_3br_plus: b.units_3br_plus != null ? String(b.units_3br_plus) : "",
    building_grade: b.building_grade ?? "",
    building_type: b.building_type ?? "",
    nearest_highway: isOther ? "Other" : hw,
    highway_other: isOther ? hw : "",
    view_type: b.view_type ?? [],
    has_pool: b.has_pool ?? false,
    has_gym: b.has_gym ?? false,
    has_school_nearby: b.has_school_nearby ?? false,
    completion_year: b.completion_year != null ? String(b.completion_year) : "",
    total_floors: b.total_floors != null ? String(b.total_floors) : "",
    notes: b.notes ?? "",
  }
}

function EditModal({
  building,
  onClose,
  onSaved,
}: {
  building: NcBuilding
  onClose: () => void
  onSaved: (updated: NcBuilding) => void
}) {
  const [form, setForm] = useState<EditFormState>(() => buildingToForm(building))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const backdropRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  function toggleView(v: string) {
    setForm(f => ({
      ...f,
      view_type: f.view_type.includes(v)
        ? f.view_type.filter(x => x !== v)
        : [...f.view_type, v],
    }))
  }

  async function save(markVerified: boolean) {
    setSaving(true)
    setError("")

    const highway =
      form.nearest_highway === "Other" ? form.highway_other.trim() :
      form.nearest_highway || null

    const payload: Record<string, unknown> = {
      slug: building.slug,
      mark_verified: markVerified,
    }

    if (form.units_studio !== "") payload.units_studio = Number(form.units_studio)
    else payload.units_studio = null
    if (form.units_1br !== "") payload.units_1br = Number(form.units_1br)
    else payload.units_1br = null
    if (form.units_2br !== "") payload.units_2br = Number(form.units_2br)
    else payload.units_2br = null
    if (form.units_3br_plus !== "") payload.units_3br_plus = Number(form.units_3br_plus)
    else payload.units_3br_plus = null

    payload.building_grade = form.building_grade || null
    payload.building_type = form.building_type || null
    payload.nearest_highway = highway
    payload.view_type = form.view_type.length > 0 ? form.view_type : null
    payload.has_pool = form.has_pool
    payload.has_gym = form.has_gym
    payload.has_school_nearby = form.has_school_nearby
    payload.completion_year = form.completion_year ? Number(form.completion_year) : null
    payload.total_floors = form.total_floors ? Number(form.total_floors) : null
    payload.notes = form.notes.trim() || null

    try {
      const res = await fetch("/api/admin/nc-buildings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Save failed")
      onSaved(data.row)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border/60 bg-card shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-card px-6 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Edit Building</p>
            <h2 className="text-base font-semibold text-foreground mt-0.5 leading-tight">{building.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Bedroom Counts */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Bedroom Counts</h3>
            <div className="grid grid-cols-4 gap-3">
              {(["units_studio", "units_1br", "units_2br", "units_3br_plus"] as const).map((field, i) => (
                <div key={field}>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                    {["Studio", "1 BR", "2 BR", "3 BR+"][i]}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder="–"
                    className="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/50"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Classification */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Classification</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1">Building Grade</label>
                <select
                  value={form.building_grade}
                  onChange={e => setForm(f => ({ ...f, building_grade: e.target.value }))}
                  className="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
                >
                  <option value="">— select —</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1">Building Type</label>
                <select
                  value={form.building_type}
                  onChange={e => setForm(f => ({ ...f, building_type: e.target.value }))}
                  className="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
                >
                  <option value="">— select —</option>
                  {BUILDING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Location & Views */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Location &amp; Views</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Nearest Highway</label>
                  <select
                    value={form.nearest_highway}
                    onChange={e => setForm(f => ({ ...f, nearest_highway: e.target.value }))}
                    className="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
                  >
                    <option value="">— select —</option>
                    {HIGHWAYS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                {form.nearest_highway === "Other" && (
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">Specify Highway</label>
                    <input
                      type="text"
                      value={form.highway_other}
                      onChange={e => setForm(f => ({ ...f, highway_other: e.target.value }))}
                      placeholder="e.g. D54"
                      className="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/50"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-2">View Type</label>
                <div className="flex flex-wrap gap-2">
                  {VIEW_OPTIONS.map(v => (
                    <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.view_type.includes(v)}
                        onChange={() => toggleView(v)}
                        className="h-3.5 w-3.5 rounded border-border/50 accent-emerald-500"
                      />
                      <span className="text-xs text-foreground">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Amenities */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Amenities</h3>
            <div className="flex gap-6">
              {(["has_pool", "has_gym", "has_school_nearby"] as const).map((field, i) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.checked }))}
                    className="h-4 w-4 rounded border-border/50 accent-emerald-500"
                  />
                  <span className="text-sm text-foreground">{["Has Pool", "Has Gym", "School Nearby"][i]}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Other */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Other</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Completion Year</label>
                  <input
                    type="number"
                    min={1980}
                    max={2040}
                    value={form.completion_year}
                    onChange={e => setForm(f => ({ ...f, completion_year: e.target.value }))}
                    placeholder="e.g. 2019"
                    className="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Total Floors</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={form.total_floors}
                    onChange={e => setForm(f => ({ ...f, total_floors: e.target.value }))}
                    placeholder="e.g. 30"
                    className="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Internal curation notes…"
                  className="w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/50 resize-none"
                />
              </div>
            </div>
          </section>

          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border/50 bg-card px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-border/50 px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="rounded-md border border-border/50 bg-accent/10 px-4 py-1.5 text-sm text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save & Mark Verified"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function NcBuildingsAdmin({ areas }: { areas: Area[] }) {
  const [rows, setRows] = useState<NcBuilding[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [area, setArea] = useState("")
  const [missing, setMissing] = useState("")
  const [quality, setQuality] = useState("")

  const [verifiedCount, setVerifiedCount] = useState(0)
  const [qualityCounts, setQualityCounts] = useState({ q1: 0, q2: 0, q3: 0 })

  const [editBuilding, setEditBuilding] = useState<NcBuilding | null>(null)

  // Debounced search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingSearch = useRef(search)

  const fetchData = useCallback(async (opts: {
    page: number; search: string; area: string; missing: string; quality: string
  }) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(opts.page),
      limit: "50",
      ...(opts.search && { search: opts.search }),
      ...(opts.area && { area: opts.area }),
      ...(opts.missing && { missing: opts.missing }),
      ...(opts.quality && { quality: opts.quality }),
    })
    try {
      const res = await fetch(`/api/admin/nc-buildings?${params}`)
      const data: ApiResponse = await res.json()
      setRows(data.rows)
      setTotal(data.total)
      setPage(data.page)
      setPages(data.pages)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch quality stats separately (no filter) on mount
  useEffect(() => {
    async function fetchStats() {
      const [q3res] = await Promise.all([
        fetch("/api/admin/nc-buildings?quality=3&limit=1"),
      ])
      const q3data: ApiResponse = await q3res.json()

      const q3 = q3data.total
      setVerifiedCount(q3)

      // Fetch individual quality counts
      const [q1res, q2res] = await Promise.all([
        fetch("/api/admin/nc-buildings?quality=1&limit=1"),
        fetch("/api/admin/nc-buildings?quality=2&limit=1"),
      ])
      const q1data: ApiResponse = await q1res.json()
      const q2data: ApiResponse = await q2res.json()
      setQualityCounts({ q1: q1data.total, q2: q2data.total, q3 })
      setVerifiedCount(q3)
    }
    fetchStats()
  }, [])

  useEffect(() => {
    pendingSearch.current = search
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      fetchData({ page: 1, search: pendingSearch.current, area, missing, quality })
    }, 350)
    return () => clearTimeout(searchTimeout.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, area, missing, quality])

  function handlePageChange(newPage: number) {
    setPage(newPage)
    fetchData({ page: newPage, search, area, missing, quality })
  }

  function handleSaved(updated: NcBuilding) {
    setRows(prev => prev.map(r => r.slug === updated.slug ? updated : r))
    // Refresh verified count if needed
    if (updated.data_quality === 3) {
      setVerifiedCount(c => c + 1)
    }
  }

  const from = total === 0 ? 0 : (page - 1) * 50 + 1
  const to = Math.min(page * 50, total)
  const progressPct = TOTAL_BUILDINGS > 0 ? (verifiedCount / TOTAL_BUILDINGS) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Data</p>
        <h1 className="text-xl font-bold text-foreground mt-0.5">NC Buildings Curation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {verifiedCount.toLocaleString()} / {TOTAL_BUILDINGS.toLocaleString()} manually verified
        </p>
        <div className="mt-3 h-2 w-full rounded-full bg-border/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progressPct.toFixed(2)}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">{progressPct.toFixed(1)}% complete</p>
      </div>

      {/* Quality stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Auto (Q1)", value: qualityCounts.q1, color: "text-zinc-400" },
          { label: "Bedrooms (Q2)", value: qualityCounts.q2, color: "text-blue-400" },
          { label: "Verified (Q3)", value: qualityCounts.q3, color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border/50 bg-card p-3">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className={`font-mono text-lg font-bold mt-0.5 ${s.color}`}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search building name…"
          className="flex-1 min-w-[180px] rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
        <select
          value={area}
          onChange={e => { setArea(e.target.value); setPage(1) }}
          className="rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
        >
          <option value="">All Areas</option>
          {areas.map(a => <option key={a.slug} value={a.slug}>{a.display_name}</option>)}
        </select>
        <select
          value={missing}
          onChange={e => { setMissing(e.target.value); setPage(1) }}
          className="rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
        >
          <option value="">All Fields</option>
          <option value="bedrooms">No Bedrooms</option>
          <option value="highway">No Highway</option>
          <option value="grade">No Grade</option>
          <option value="view">No View</option>
        </select>
        <select
          value={quality}
          onChange={e => { setQuality(e.target.value); setPage(1) }}
          className="rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
        >
          <option value="">All Quality</option>
          <option value="1">1 = auto</option>
          <option value="2">2 = bedrooms</option>
          <option value="3">3 = verified</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">No buildings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left min-w-[200px]">Name</th>
                  <th className="px-4 py-3 text-left">Area</th>
                  <th className="px-4 py-3 text-left">Grade</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Developer</th>
                  <th className="px-4 py-3 text-right">Year</th>
                  <th className="px-4 py-3 text-right">Flrs</th>
                  <th className="px-4 py-3 text-right">1BR</th>
                  <th className="px-4 py-3 text-right">2BR</th>
                  <th className="px-4 py-3 text-right">3BR+</th>
                  <th className="px-4 py-3 text-left">Highway</th>
                  <th className="px-4 py-3 text-left">Station</th>
                  <th className="px-4 py-3 text-right">School</th>
                  <th className="px-4 py-3 text-left">Quality</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {rows.map((row, idx) => (
                  <tr key={row.slug} className="hover:bg-accent/5 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground/60">
                      {from + idx}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground leading-tight truncate max-w-[220px]" title={row.name}>{row.name}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs truncate max-w-[120px]">
                      {row.nc_area_slug ?? <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {row.building_grade
                        ? <span className="text-foreground capitalize">{row.building_grade}</span>
                        : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {row.status
                        ? <span className="font-mono text-foreground">{row.status}</span>
                        : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[140px]">
                      {row.developer ?? <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-foreground">
                      {row.completion_year ?? <span className="text-muted-foreground/30">–</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                      {row.total_floors ?? <span className="text-muted-foreground/30">–</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                      {row.units_1br ?? <span className="text-muted-foreground/30">–</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                      {row.units_2br ?? <span className="text-muted-foreground/30">–</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                      {row.units_3br_plus ?? <span className="text-muted-foreground/30">–</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {row.nearest_highway
                        ? <span className="font-mono text-foreground">{row.nearest_highway}</span>
                        : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {row.nearest_metro
                        ? <span className="font-mono text-foreground">{row.nearest_metro}</span>
                        : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.has_school_nearby == null
                        ? <span className="font-mono text-xs text-muted-foreground/30">—</span>
                        : <span className={`font-mono text-xs font-semibold ${row.has_school_nearby ? 'text-emerald-400' : 'text-muted-foreground/40'}`}>
                            {row.has_school_nearby ? 'Y' : 'N'}
                          </span>
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      <QualityBadge quality={row.data_quality} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setEditBuilding(row)}
                        className="rounded px-2 py-1 text-[11px] font-medium text-accent border border-accent/30 hover:bg-accent/10 transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {from}–{to} of {total.toLocaleString()}</span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="rounded-md border border-border/50 px-3 py-1 text-xs hover:bg-accent/10 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-xs">
              {page} / {pages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pages || loading}
              className="rounded-md border border-border/50 px-3 py-1 text-xs hover:bg-accent/10 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editBuilding && (
        <EditModal
          building={editBuilding}
          onClose={() => setEditBuilding(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
