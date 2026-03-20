'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, TrendingUp, TrendingDown, Info } from 'lucide-react'
import { Community } from '@/lib/mock-communities'
import { cn } from '@/lib/utils'

const formatPrice = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

const formatNumber = (n: number) =>
  new Intl.NumberFormat('en-US').format(n)

function YieldBadge({ value }: { value: number }) {
  if (value === 0) return <span className="font-mono text-xs text-muted-foreground/30">—</span>
  const color =
    value >= 7 ? 'text-emerald-400 bg-emerald-400/10 ring-emerald-400/20' :
    value >= 5.5 ? 'text-yellow-400 bg-yellow-400/10 ring-yellow-400/20' :
    'text-red-400 bg-red-400/10 ring-red-400/20'
  return (
    <span className={cn('font-mono text-xs font-bold px-1.5 py-0.5 rounded ring-1', color)}>
      {value.toFixed(1)}%
    </span>
  )
}

function MomBadge({ value }: { value: number }) {
  const num = Number(value)
  const isPos = num >= 0
  return (
    <span className={cn('flex items-center gap-0.5 font-mono text-xs font-semibold',
      isPos ? 'text-emerald-400' : 'text-red-400')}>
      {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPos ? '+' : ''}{num.toFixed(1)}%
    </span>
  )
}

function InfoTip({ text }: { text: string }) {
  return (
    <span title={text} className="ml-1 inline-flex items-center cursor-help">
      <Info className="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
    </span>
  )
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (!sorted) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
  if (sorted === 'asc') return <ArrowUp className="ml-1 h-3 w-3 text-accent" />
  return <ArrowDown className="ml-1 h-3 w-3 text-accent" />
}

interface Props {
  data: Community[]
}

export function CommunitiesTable({ data }: Props) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo<ColumnDef<Community>[]>(() => [
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
          Community <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground text-sm leading-tight">{row.original.name}</p>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide mt-0.5">
            {row.original.area}
            {!row.original.isFreehold && (
              <span className="ml-1.5 text-yellow-500/70">Leasehold</span>
            )}
          </p>
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: 'avgPricePerSqft',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          AED/sqft <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
          {formatNumber(getValue<number>())}
        </span>
      ),
      size: 110,
    },
    {
      accessorKey: 'medianPrice',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          Med. Price <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="font-mono text-sm text-foreground tabular-nums">
          {formatPrice(getValue<number>())}
        </span>
      ),
      size: 110,
    },
    {
      accessorKey: 'totalUnits',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          Units <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => {
        if (row.original.totalUnits === 0) {
          return <span className="font-mono text-sm text-muted-foreground/30 tabular-nums">—</span>
        }
        const aptPct = Math.round((row.original.apartments / row.original.totalUnits) * 100)
        return (
          <div className="text-right">
            <p className="font-mono text-sm text-foreground tabular-nums">
              {formatNumber(row.original.totalUnits)}
            </p>
            <div className="flex items-center gap-1 justify-end mt-0.5">
              <div className="h-1 w-10 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-accent/60 rounded-full"
                  style={{ width: `${aptPct}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{aptPct}% apt</span>
            </div>
          </div>
        )
      },
      size: 120,
    },
    {
      accessorKey: 'grossYield',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          Yield <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <div className="flex justify-end">
          <YieldBadge value={getValue<number>()} />
        </div>
      ),
      size: 90,
    },
    {
      accessorKey: 'transactions30d',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          Txns 30d <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="font-mono text-sm text-foreground tabular-nums">
          {getValue<number>()}
        </span>
      ),
      size: 95,
    },
    {
      accessorKey: 'upcomingSupply',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          Pipeline <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const val = getValue<number>()
        return (
          <span className={cn('font-mono text-sm tabular-nums',
            val > 2000 ? 'text-yellow-400' : val > 0 ? 'text-muted-foreground' : 'text-muted-foreground/40')}>
            {val > 0 ? `+${formatNumber(val)}` : '—'}
          </span>
        )
      },
      size: 95,
    },
    {
      accessorKey: 'momChange',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          MoM Δ
          <InfoTip text="Month-over-Month change: how much the avg price per sqft moved vs the previous month. Green = rising, red = falling." />
          <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <div className="flex justify-end">
          <MomBadge value={getValue<number>()} />
        </div>
      ),
      size: 90,
    },
    {
      accessorKey: 'avgDaysOnMarket',
      header: ({ column }) => (
        <button className="flex items-center justify-end w-full" onClick={() => column.toggleSorting()}>
          DOM
          <InfoTip text="Days on Market: average number of days a listing sits before it sells. Lower = faster-moving market." />
          <SortIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const val = getValue<number>()
        if (val === 0) return <span className="font-mono text-sm text-muted-foreground/30 tabular-nums">—</span>
        return <span className="font-mono text-sm text-muted-foreground tabular-nums">{val}d</span>
      },
      size: 70,
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
      return (
        row.original.name.toLowerCase().includes(search) ||
        row.original.area.toLowerCase().includes(search)
      )
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
            placeholder="Search communities..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
          />
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          {table.getFilteredRowModel().rows.length} communities · click any row to explore
        </p>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm border-collapse">
          <thead>
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
            {table.getFilteredRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                onClick={() => router.push(`/terminal/communities/${row.original.slug}`)}
                className={cn(
                  'group border-b border-border/30 cursor-pointer transition-colors hover:bg-accent/5 last:border-0',
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
