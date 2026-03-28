'use client'

import { useMemo } from 'react'
import { GatedTableOverlay } from '@/components/auth/gated-table-overlay'
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
import { ArrowUpDown, ArrowUp, ArrowDown, Search, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

type BuildingRow = {
  building_key: string
  building_name_en: string
  area_name_en: string | null
  primary_sub_type: string | null
  developer_name: string | null
  completion_year: number | null
  propsearch_status: string | null
  osm_lat: string | null
  osm_lng: string | null
}

type StatusConfig = {
  label: string
  className: string
}

const STATUS_MAP: Record<string, StatusConfig> = {
  complete: { label: 'Complete', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  under_construction: { label: 'Under Constr.', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  planned: { label: 'Planned', className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/15 text-red-400 border-red-500/20' },
  unknown: { label: 'Unknown', className: 'bg-muted/50 text-muted-foreground border-border/40' },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="font-mono text-xs text-muted-foreground/30">—</span>
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.unknown
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap', cfg.className)}>
      {cfg.label}
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
  isAuthenticated?: boolean
  totalRows?: number
}

export function BuildingsTable({ data, isAuthenticated = true, totalRows }: Props) {
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
      accessorKey: 'building_name_en',
      header: ({ column }) => (
        <button className="flex items-center text-left" onClick={() => column.toggleSorting()}>
          Building <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <p className="font-medium text-foreground text-sm leading-tight">{getValue<string>()}</p>
      ),
      size: 240,
    },
    {
      accessorKey: 'area_name_en',
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
      accessorKey: 'primary_sub_type',
      header: 'Type',
      cell: ({ getValue }) => {
        const val = getValue<string | null>()
        if (!val) return <span className="font-mono text-xs text-muted-foreground/30">—</span>
        return <span className="font-mono text-xs text-muted-foreground">{val}</span>
      },
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: 'propsearch_status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue<string | null>()} />,
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: 'developer_name',
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
      id: 'coords',
      header: () => (
        <span className="flex items-center justify-center gap-1">
          <MapPin className="h-3 w-3" />
        </span>
      ),
      accessorFn: (row) => (row.osm_lat != null && row.osm_lng != null ? 1 : 0),
      cell: ({ row }) => {
        const hasCoords = row.original.osm_lat != null && row.original.osm_lng != null
        return (
          <span title={hasCoords ? `${row.original.osm_lat}, ${row.original.osm_lng}` : 'No coordinates'}>
            <MapPin className={cn('h-3.5 w-3.5 mx-auto', hasCoords ? 'text-emerald-400' : 'text-muted-foreground/20')} />
          </span>
        )
      },
      enableSorting: false,
      size: 50,
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
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase()
      const name = (row.original.building_name_en ?? '').toLowerCase()
      const area = (row.original.area_name_en ?? '').toLowerCase()
      return name.includes(search) || area.includes(search)
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
            placeholder="Search buildings or areas..."
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

        {/* Gated overlay */}
        {!isAuthenticated && totalRows !== undefined && (
          <GatedTableOverlay freeRows={data.length} totalRows={totalRows} />
        )}
      </div>
    </div>
  )
}
