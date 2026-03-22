type DayRow = { day: string; daily_txns: number }

interface Props {
  rows: DayRow[]
  year: number
}

function intensityClass(count: number): string {
  if (count === 0) return "bg-border/20"
  if (count <= 10) return "bg-indigo-800"
  if (count <= 30) return "bg-blue-600"
  if (count <= 100) return "bg-emerald-500"
  return "bg-yellow-400"
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// Returns 0=Mon … 6=Sun (ISO weekday)
function isoDay(d: Date): number {
  return (d.getDay() + 6) % 7
}

export function TransactionHeatmap({ rows, year }: Props) {
  const countByDay = new Map<string, number>()
  for (const r of rows) countByDay.set(r.day, r.daily_txns)

  // Build the full year grid, padded to start on Monday
  const jan1 = new Date(Date.UTC(year, 0, 1))
  const startOffset = isoDay(jan1) // leading empty cells
  const dec31 = new Date(Date.UTC(year, 11, 31))
  const totalDays = Math.floor((dec31.getTime() - jan1.getTime()) / 86400000) + 1

  // Build cell list (leading nulls + day entries)
  type Cell = { date: Date; key: string; count: number } | null
  const cells: Cell[] = Array(startOffset).fill(null)
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(Date.UTC(year, 0, 1 + i))
    const key = date.toISOString().slice(0, 10)
    cells.push({ date, key, count: countByDay.get(key) ?? 0 })
  }

  // Group into weeks (columns)
  const weeks: Cell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  // Month label positions: week index where a month starts
  const monthStarts: { week: number; label: string }[] = []
  weeks.forEach((week, wi) => {
    for (const cell of week) {
      if (cell && cell.date.getUTCDate() === 1) {
        monthStarts.push({ week: wi, label: MONTH_NAMES[cell.date.getUTCMonth()] })
        break
      }
    }
  })

  return (
    <div className="rounded-md border border-border/40 bg-card/40 p-4 space-y-3 overflow-x-auto">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        Daily Transaction Activity — {year}
      </p>

      <div className="flex gap-3">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-[3px] pt-5 shrink-0">
          {DOW_LABELS.map((d, i) => (
            <div key={d} className="h-[11px] flex items-center">
              {i % 2 === 0 && (
                <span className="text-[8px] text-muted-foreground/50 uppercase tracking-widest w-6">{d}</span>
              )}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {/* Month labels row */}
          <div className="flex gap-[3px] mb-1" style={{ paddingLeft: 0 }}>
            {weeks.map((_, wi) => {
              const ms = monthStarts.find(m => m.week === wi)
              return (
                <div key={wi} className="w-[11px] shrink-0">
                  {ms && (
                    <span className="text-[8px] text-muted-foreground/50 uppercase tracking-widest whitespace-nowrap">
                      {ms.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Cells: rows = DOW, cols = weeks */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, di) => {
                  const cell = week[di] ?? null
                  if (!cell) {
                    return <div key={di} className="w-[11px] h-[11px]" />
                  }
                  return (
                    <div
                      key={di}
                      title={`${cell.key}: ${cell.count.toLocaleString()} txns`}
                      className={`w-[11px] h-[11px] rounded-[2px] ${intensityClass(cell.count)}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[8px] text-muted-foreground/50 uppercase tracking-widest">Less</span>
        {[0, 5, 20, 60, 120].map((v, i) => (
          <div key={i} className={`w-[11px] h-[11px] rounded-[2px] ${intensityClass(v)}`} />
        ))}
        <span className="text-[8px] text-muted-foreground/50 uppercase tracking-widest">More</span>
      </div>
    </div>
  )
}
