'use client'

import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DealModal, type DistressFeedCardProps } from '@/components/terminal/distress-feed-card'

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (!sorted) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
  if (sorted === 'asc') return <ArrowUp className="ml-1 h-3 w-3 text-accent" />
  return <ArrowDown className="ml-1 h-3 w-3 text-accent" />
}

interface Props {
  deals: DistressFeedCardProps[]
}

export function DistressTable({ deals }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [openDeal, setOpenDeal] = useState<DistressFeedCardProps | null>(null)

  const columns = useMemo<ColumnDef<DistressFeedCardProps>[]>(() => [
    {
      id: 'rank',
      header: '#',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground/40 w-6 inline-block tabular-nums">
          {row.index + 1}
        </span>
      ),
      enableSorting: false,
      size: 40,
    },
    {
      id: 'property',
      accessorFn: (row) => row.title,
      header: 'Property',
      cell: ({ row }) => (
        <div className="max-w-[220px]">
          <p className="font-medium text-foreground text-sm leading-tight truncate">{row.original.title}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{row.original.location}</p>
        </div>
      ),
      size: 240,
      enableSorting: false,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <span className="font-mono text-[10px] uppercase tracking-wider border border-border/50 rounded-sm px-1.5 py-0.5 text-muted-foreground">
          {getValue<string>()}
        </span>
      ),
      size: 100,
      enableSorting: false,
    },
    {
      accessorKey: 'bedrooms',
      header: 'Beds',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs tabular-nums text-foreground">
          {getValue<string | number>()}
        </span>
      ),
      size: 55,
      enableSorting: false,
    },
    {
      accessorKey: 'sizeSqft',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          Size <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="font-mono text-xs tabular-nums text-foreground">
          {new Intl.NumberFormat('en-US').format(getValue<number>())}
        </span>
      ),
      size: 90,
    },
    {
      accessorKey: 'psf',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          PSF <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => {
        const { psf, areaBenchmarkPsf } = row.original
        const isBelowAvg = areaBenchmarkPsf !== null && psf > 0 && psf < areaBenchmarkPsf
        return (
          <span className={cn(
            'font-mono text-xs tabular-nums font-semibold',
            isBelowAvg ? 'text-emerald-400' : 'text-foreground'
          )}>
            {psf > 0 ? psf.toLocaleString() : '—'}
          </span>
        )
      },
      size: 80,
    },
    {
      accessorKey: 'daysOnMarket',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          Days <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => {
        const days = row.original.daysOnMarket
        const tier = row.original.domTier
        const colorClass =
          tier === 'fresh' ? 'text-emerald-400' :
          tier === 'aging' ? 'text-yellow-400' :
          tier === 'stale' ? 'text-orange-400' :
          'text-red-400'
        return (
          <span className={cn('font-mono text-xs tabular-nums font-semibold', colorClass)}>
            {days}d
          </span>
        )
      },
      size: 70,
    },
    {
      accessorKey: 'distressScore',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          Score <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const score = getValue<number>()
        const colorClass =
          score >= 60 ? 'text-red-400 bg-red-500/10 ring-red-500/20' :
          score >= 35 ? 'text-orange-400 bg-orange-500/10 ring-orange-500/20' :
          'text-yellow-400 bg-yellow-500/10 ring-yellow-500/20'
        return (
          <span className={cn(
            'font-mono text-[10px] font-bold rounded px-1.5 py-0.5 ring-1 tabular-nums',
            colorClass
          )}>
            {score}
          </span>
        )
      },
      size: 70,
    },
    {
      id: 'action',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setOpenDeal(row.original)
          }}
          className="font-mono text-[10px] uppercase tracking-widest border border-border/50 rounded-sm px-2 py-1 text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
        >
          View
        </button>
      ),
      size: 60,
      enableSorting: false,
    },
  ], [])

  const table = useReactTable({
    data: deals,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase()
      return (
        row.original.title.toLowerCase().includes(search) ||
        row.original.location.toLowerCase().includes(search)
      )
    },
  })

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Search + count bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Filter by title or location..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            />
          </div>
          <p className="text-xs font-mono text-muted-foreground">
            {table.getFilteredRowModel().rows.length} deals · click any row to inspect
          </p>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto rounded-xl border border-border/40 bg-card/40">
          <table className="w-full text-sm border-collapse">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-border/50 bg-muted/30">
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground first:text-left whitespace-nowrap"
                      style={{ width: header.column.columnDef.size }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No deals match the current filter.
                  </td>
                </tr>
              ) : table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => setOpenDeal(row.original)}
                  className={cn(
                    'group border-b border-border/30 cursor-pointer transition-colors hover:bg-muted/30 last:border-0',
                    i % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                  )}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="px-3 py-3 text-right first:text-left last:text-center align-middle"
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

      {openDeal && (
        <DealModal deal={openDeal} onClose={() => setOpenDeal(null)} />
      )}
    </>
  )
}
