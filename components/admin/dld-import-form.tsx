"use client"

import { useRef, useState } from "react"
import { Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react"

type Result = {
  ok: boolean
  rows_parsed?: number
  upserted?: number
  skipped?: number
  new_latest_date?: string | null
  refresh_error?: string | null
  error?: string
}

export function DldImportForm() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const handleFile = (f: File) => {
    setFile(f)
    setResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/admin/ingest-transactions", { method: "POST", body: fd })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ ok: false, error: "Network error — check console" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${dragging
            ? "border-accent bg-accent/10"
            : "border-border/50 hover:border-accent/40 hover:bg-accent/5"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-3" />
        {file ? (
          <div>
            <p className="text-sm font-mono text-foreground font-semibold">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground">
              Drop CSV here or click to browse
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
              DLD new-format CSV (TRANSACTION_NUMBER, INSTANCE_DATE, …)
            </p>
          </div>
        )}
      </div>

      {/* Upload button */}
      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        className="
          w-full flex items-center justify-center gap-2 rounded-lg
          bg-accent text-accent-foreground font-mono text-sm font-semibold
          py-2.5 px-4 transition-opacity
          disabled:opacity-40 disabled:cursor-not-allowed
          hover:opacity-90
        "
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Ingesting…</>
        ) : (
          <><Upload className="h-4 w-4" /> Import & Refresh Views</>
        )}
      </button>

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-4 space-y-2 ${
          result.ok
            ? "border-emerald-400/30 bg-emerald-400/5"
            : "border-red-400/30 bg-red-400/5"
        }`}>
          <div className="flex items-center gap-2">
            {result.ok
              ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              : <XCircle className="h-4 w-4 text-red-400" />
            }
            <span className={`font-mono text-xs font-semibold ${result.ok ? "text-emerald-400" : "text-red-400"}`}>
              {result.ok ? "Import complete" : "Import failed"}
            </span>
          </div>
          {result.ok ? (
            <dl className="space-y-1 text-xs font-mono">
              <div className="flex justify-between"><dt className="text-muted-foreground">Rows parsed</dt><dd className="text-foreground">{result.rows_parsed?.toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Upserted</dt><dd className="text-emerald-400 font-semibold">{result.upserted?.toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Skipped</dt><dd className="text-foreground">{result.skipped?.toLocaleString()}</dd></div>
              {result.new_latest_date && (
                <div className="flex justify-between"><dt className="text-muted-foreground">New latest date</dt><dd className="text-foreground">{result.new_latest_date}</dd></div>
              )}
              {result.refresh_error && (
                <p className="text-yellow-400 mt-1">⚠ View refresh error: {result.refresh_error}</p>
              )}
            </dl>
          ) : (
            <p className="text-xs font-mono text-red-400">{result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}
