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
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

const CURRENT_YEAR = 2026

export type PropBuildingRow = {
  building_slug: string
  name: string | null
  area_slug: string | null
  area_name: string | null
  status: string | null
  completion_year: number | null
  total_floors: number | null
  total_units: number | null
  building_type: string | null
  developer: string | null
  is_freehold: boolean | null
  property_types: string | null
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  complete:           { label: 'Complete',       className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  under_construction: { label: 'Under Constr.',  className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  planned:            { label: 'Planned',         className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  cancelled:          { label: 'Cancelled',       className: 'bg-red-500/15 text-red-400 border-red-500/20' },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground/30 font-mono text-xs">—</span>
  const cfg = STATUS_MAP[status] ?? { label: status, className: 'bg-muted/50 text-muted-foreground border-border/40' }
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap', cfg.className)}>
      {cfg.label}
    </span>
  )
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (!sorted) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40 shrink-0" />
  if (sorted === 'asc') return <ArrowUp className="ml-1 h-3 w-3 text-accent shrink-0" />
  return <ArrowDown className="ml-1 h-3 w-3 text-accent shrink-0" />
}

function Dash() {
  return <span className="text-muted-foreground/30 font-mono text-xs">—</span>
}

interface Props {
  data: PropBuildingRow[]
}

export function PropBuildingsTable({ data }: Props) {
  const [sorting, setSorting] = useLocalStorage<SortingState>('terminal:prop-buildings:sort', [])
  const [globalFilter, setGlobalFilter] = useLocalStorage<string>('terminal:prop-buildings:filter', '')

  const columns = useMemo<ColumnDef<PropBuildingRow>[]>(() => [
    {
      id: 'rank',
      header: '#',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground/40 w-6 inline-block tabular-nums">
          {row.index + 1}
        </span>
      ),
      enableSorting: false,
      size: 44,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <button className="flex items-center gap-0.5 text-left" onClick={() => column.toggleSorting()}>
          Building <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => {
        const name = row.original.name ?? row.original.building_slug
        return (
          <Link
            href={`/terminal/prop-buildings/${row.original.building_slug}`}
            className="group flex items-center gap-1.5 font-medium text-foreground hover:text-accent text-sm leading-snug transition-colors"
          >
            <span className="line-clamp-2">{name}</span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
          </Link>
        )
      },
      size: 230,
    },
    {
      accessorKey: 'area_name',
      header: ({ column }) => (
        <button className="flex items-center gap-0.5 text-left" onClick={() => column.toggleSorting()}>
          Area <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const val = getValue<string | null>()
        if (!val) return <Dash />
        return <span className="text-sm text-muted-foreground whitespace-nowrap">{val}</span>
      },
      size: 160,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue<string | null>()} />,
      enableSorting: false,
      size: 110,
    },
    {
      accessorKey: 'completion_year',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full gap-0.5" onClick={() => column.toggleSorting()}>
          Year <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const year = getValue<number | null>()
        if (!year) return <div className="text-right"><Dash /></div>
        const age = CURRENT_YEAR - year
        return (
          <div className="text-right">
            <span className="font-mono text-sm text-foreground tabular-nums">{year}</span>
            {age >= 0 && age < 50 && (
              <span className="ml-1.5 font-mono text-[10px] text-muted-foreground/60">
                {age === 0 ? 'new' : `${age}y`}
              </span>
            )}
          </div>
        )
      },
      size: 80,
    },
    {
      accessorKey: 'total_floors',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full gap-0.5" onClick={() => column.toggleSorting()}>
          Floors <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const val = getValue<number | null>()
        return <div className="text-right">{val ? <span className="font-mono text-sm tabular-nums">{val}</span> : <Dash />}</div>
      },
      size: 68,
    },
    {
      accessorKey: 'total_units',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full gap-0.5" onClick={() => column.toggleSorting()}>
          Units <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const val = getValue<number | null>()
        return <div className="text-right">{val ? <span className="font-mono text-sm tabular-nums">{val.toLocaleString()}</span> : <Dash />}</div>
      },
      size: 72,
    },
    {
      accessorKey: 'developer',
      header: 'Developer',
      cell: ({ getValue }) => {
        const val = getValue<string | null>()
        if (!val) return <Dash />
        return <span className="text-sm text-muted-foreground truncate block max-w-[160px]">{val}</span>
      },
      enableSorting: false,
      size: 170,
    },
    {
      accessorKey: 'is_freehold',
      header: 'Tenure',
      cell: ({ getValue }) => {
        const val = getValue<boolean | null>()
        if (val === null) return <Dash />
        return (
          <span className={cn(
            'font-mono text-[10px] font-semibold',
            val ? 'text-accent' : 'text-muted-foreground/60'
          )}>
            {val ? 'FH' : 'LH'}
          </span>
        )
      },
      enableSorting: false,
      size: 56,
    },
  ], [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _col, filterValue) => {
      const q = filterValue.toLowerCase()
      return (
        (row.original.name ?? '').toLowerCase().includes(q) ||
        (row.original.area_name ?? '').toLowerCase().includes(q) ||
        (row.original.developer ?? '').toLowerCase().includes(q)
      )
    },
  })

  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
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
        <p className="text-xs font-mono text-muted-foreground shrink-0">
          {rows.length.toLocaleString()} buildings
        </p>
      </div>

      {/* Table */}
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No buildings match your search.
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-border/30 transition-colors last:border-0 hover:bg-muted/20',
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
  )
}
