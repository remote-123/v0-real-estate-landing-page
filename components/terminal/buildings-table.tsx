'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ExternalLink, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BuildingRow } from '@/app/terminal/buildings/page'

const GRADE_STYLES: Record<string, string> = {
  luxury:     'bg-purple-500/15 text-purple-300 border-purple-500/20',
  premium:    'bg-blue-500/15 text-blue-300 border-blue-500/20',
  mid:        'bg-zinc-500/15 text-zinc-300 border-zinc-500/20',
  affordable: 'bg-green-500/15 text-green-400 border-green-500/20',
}

const STATUS_STYLES: Record<string, string> = {
  complete:           'bg-accent/15 text-accent border-accent/20',
  under_construction: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  under_development:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  planned:            'bg-blue-500/15 text-blue-400 border-blue-500/20',
  cancelled:          'bg-red-500/15 text-red-400 border-red-500/20',
  demolished:         'bg-red-500/15 text-red-400 border-red-500/20',
  under_renovation:   'bg-orange-500/15 text-orange-400 border-orange-500/20',
}

const STATUS_LABELS: Record<string, string> = {
  complete:           'Complete',
  under_construction: 'Under Constr.',
  under_development:  'Under Dev.',
  planned:            'Planned',
  cancelled:          'Cancelled',
  demolished:         'Demolished',
  under_renovation:   'Renovation',
}

function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return <span className="font-mono text-xs text-muted-foreground/30">—</span>
  const cls = GRADE_STYLES[grade] ?? 'bg-muted/50 text-muted-foreground border-border/40'
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap capitalize', cls)}>
      {grade}
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="font-mono text-xs text-muted-foreground/30">—</span>
  const key = status.replace(/ /g, '_')
  const cls = STATUS_STYLES[key] ?? 'bg-muted/50 text-muted-foreground border-border/40'
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap', cls)}>
      {STATUS_LABELS[key] ?? status}
    </span>
  )
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (!sorted) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
  if (sorted === 'asc') return <ArrowUp className="ml-1 h-3 w-3 text-accent" />
  return <ArrowDown className="ml-1 h-3 w-3 text-accent" />
}

interface Props {
  data: BuildingRow[]
}

export function BuildingsTable({ data }: Props) {
  const [sorting, setSorting] = useLocalStorage<SortingState>('terminal:buildings:sort', [])
  const [globalFilter, setGlobalFilter] = useLocalStorage<string>('terminal:buildings:filter', '')

  const columns = useMemo<ColumnDef<BuildingRow>[]>(() => [
    {
      id: 'rank',
      header: '#',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground/40 w-6 inline-block">
          {row.index + 1}
        </span>
      ),
      enableSorting: false,
      size: 40,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <button className="flex items-center text-left" onClick={() => column.toggleSorting()}>
          Building <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => {
        const name = row.original.name
        const href = row.original.global_slug
          ? `/terminal/buildings/${row.original.global_slug}`
          : `/terminal/buildings/${row.original.nc_slug}`
        return (
          <Link
            href={href}
            className="group flex items-center gap-1.5 font-medium text-foreground hover:text-accent text-sm leading-tight transition-colors"
          >
            {name}
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
          </Link>
        )
      },
      size: 240,
    },
    {
      accessorKey: 'area_display',
      header: ({ column }) => (
        <button className="flex items-center text-left" onClick={() => column.toggleSorting()}>
          Area <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const val = getValue<string | null>()
        if (!val) return <span className="font-mono text-xs text-muted-foreground/30">—</span>
        return <span className="text-sm text-muted-foreground">{val}</span>
      },
      size: 160,
    },
    {
      accessorKey: 'building_grade',
      header: 'Grade',
      cell: ({ getValue }) => <GradeBadge grade={getValue<string | null>()} />,
      enableSorting: true,
      size: 100,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue<string | null>()} />,
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: 'developer',
      header: 'Developer',
      cell: ({ getValue }) => {
        const val = getValue<string | null>()
        if (!val) return <span className="font-mono text-xs text-muted-foreground/30">—</span>
        return <span className="text-sm text-muted-foreground truncate max-w-[160px] block">{val}</span>
      },
      enableSorting: false,
      size: 180,
    },
    {
      accessorKey: 'completion_year',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          Year <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const val = getValue<number | null>()
        if (!val) return <span className="font-mono text-xs text-muted-foreground/30 tabular-nums">—</span>
        return <span className="font-mono text-sm text-foreground tabular-nums">{val}</span>
      },
      size: 70,
    },
    {
      accessorKey: 'total_floors',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          Flrs <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const val = getValue<number | null>()
        if (!val) return <span className="font-mono text-xs text-muted-foreground/30 tabular-nums">—</span>
        return <span className="font-mono text-sm text-foreground tabular-nums">{val}</span>
      },
      size: 60,
    },
    {
      accessorKey: 'units_1br',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          1BR <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const val = getValue<number | null>()
        if (val == null) return <span className="font-mono text-xs text-muted-foreground/30 tabular-nums">—</span>
        return <span className="font-mono text-xs text-muted-foreground tabular-nums">{val}</span>
      },
      size: 55,
    },
    {
      accessorKey: 'units_2br',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          2BR <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const val = getValue<number | null>()
        if (val == null) return <span className="font-mono text-xs text-muted-foreground/30 tabular-nums">—</span>
        return <span className="font-mono text-xs text-muted-foreground tabular-nums">{val}</span>
      },
      size: 55,
    },
    {
      accessorKey: 'units_3br_plus',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          3BR+ <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const val = getValue<number | null>()
        if (val == null) return <span className="font-mono text-xs text-muted-foreground/30 tabular-nums">—</span>
        return <span className="font-mono text-xs text-muted-foreground tabular-nums">{val}</span>
      },
      size: 55,
    },
    {
      accessorKey: 'nearest_highway',
      header: 'Highway',
      cell: ({ getValue }) => {
        const val = getValue<string | null>()
        if (!val) return <span className="font-mono text-xs text-muted-foreground/30">—</span>
        return <span className="font-mono text-xs text-foreground">{val}</span>
      },
      enableSorting: false,
      size: 80,
    },
    {
      accessorKey: 'nearest_metro',
      header: 'Station',
      cell: ({ getValue }) => {
        const val = getValue<string | null>()
        if (!val) return <span className="font-mono text-xs text-muted-foreground/30">—</span>
        return <span className="font-mono text-xs text-foreground">{val}</span>
      },
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: 'has_school_nearby',
      header: () => (
        <div className="flex items-center justify-end gap-1">
          School
          <span title="School within the community">
            <Info className="h-3 w-3 text-muted-foreground/50" />
          </span>
        </div>
      ),
      cell: ({ getValue }) => {
        const val = getValue<boolean | null>()
        if (val == null) return <span className="font-mono text-xs text-muted-foreground/30">—</span>
        return (
          <span className={cn('font-mono text-xs font-semibold', val ? 'text-emerald-400' : 'text-muted-foreground/40')}>
            {val ? 'Y' : 'N'}
          </span>
        )
      },
      enableSorting: false,
      size: 65,
    },
  ], [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: (updater) => setSorting(typeof updater === 'function' ? updater(sorting) : updater),
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase()
      const name = (row.original.name ?? '').toLowerCase()
      const area = (row.original.area_display ?? '').toLowerCase()
      const dev = (row.original.developer ?? '').toLowerCase()
      return name.includes(search) || area.includes(search) || dev.includes(search)
    },
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Search + stats bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search buildings, areas, developers…"
            className="w-full pl-9 pr-4 py-2 text-base sm:text-sm bg-card border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
          />
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          {table.getFilteredRowModel().rows.length} buildings
        </p>
      </div>

      {/* Table */}
      <div className="relative">
        <div className="w-full overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-border/50 bg-muted/30">
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:text-left whitespace-nowrap"
                      style={{ width: header.column.columnDef.size }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-border/30 transition-colors last:border-0',
                    i % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                  )}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="px-3 py-3 text-right first:text-left align-middle"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
