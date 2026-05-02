"use client"

import { useState, useEffect, useRef } from "react"
import { Heart, Save, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react"

const DEFAULT_CRITERIA = `## Autonomous Improvement Cycle — v0-real-estate-landing-page

You are running an autonomous improvement cycle for the repo at /Users/hl/Documents/GitHub/v0-real-estate-landing-page.

**HARD RULES:**
- NO git push — local commits only
- Minimum MEDIUM effort per cycle — no low-hanging fruit, no trivial fixes
- Plan BEFORE coding — use Agent tool with subagent_type="Plan" or "architecture" first
- Log EVERYTHING in docs/DAILY_LOG.md and relevant vault/ notes
- If a task is too large for one cycle, commit progress and continue next cycle

**PROCESS FOR EACH CYCLE:**

1. **Orient** — Read MEMORY.md and relevant vault notes to understand current state.
2. **Identify opportunity** — Analyze the repo and identify the highest-value opportunity NOT yet done.
3. **Plan** — Write a clear implementation plan before touching any code.
4. **Execute** — Implement using Agent tool with appropriate subagent_type.
5. **Commit** — git add + git commit locally. NO git push.
6. **Log** — Update docs/DAILY_LOG.md with what was built.

Pick ONE ambitious thing per cycle and do it well. Quality over quantity.`

const INTERVAL_OPTIONS = [5, 10, 15, 30, 60]

interface Config {
  enabled: boolean
  criteria: string
  interval_minutes: number
  updated_at: string | null
}

export default function HeartbeatConfigPage() {
  const [config, setConfig] = useState<Config>({
    enabled: false,
    criteria: DEFAULT_CRITERIA,
    interval_minutes: 10,
    updated_at: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch("/api/admin/heartbeat")
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          enabled: Boolean(data.enabled),
          criteria: data.criteria || DEFAULT_CRITERIA,
          interval_minutes: Number(data.interval_minutes) || 10,
          updated_at: data.updated_at ?? null,
        })
      })
      .catch(() => {/* keep defaults */})
      .finally(() => setLoading(false))
  }, [])

  async function save(patch: Partial<Config>) {
    const next = { ...config, ...patch }
    setConfig(next)
    setSaving(true)
    setSaveStatus("idle")
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    try {
      const res = await fetch("/api/admin/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: next.enabled,
          criteria: next.criteria,
          interval_minutes: next.interval_minutes,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? "Save failed")
      }
      setSaveStatus("saved")
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000)
    } catch (err) {
      setSaveStatus("error")
      setErrorMsg(String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading heartbeat config…
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-accent" />
            <h1 className="text-xl font-bold text-foreground">Heartbeat</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure the autonomous improvement cycle that runs every N minutes during a Claude Code session.
          </p>
        </div>

        {/* Enabled toggle */}
        <button
          type="button"
          onClick={() => save({ enabled: !config.enabled })}
          disabled={saving}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 ${
            config.enabled
              ? "bg-emerald-500 border-emerald-500"
              : "bg-muted border-border"
          }`}
          aria-label={config.enabled ? "Disable heartbeat" : "Enable heartbeat"}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
              config.enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Status bar */}
      <div className={`rounded-lg border px-4 py-2.5 flex items-center gap-2 text-sm ${
        config.enabled
          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
          : "border-border/40 bg-card/40 text-muted-foreground"
      }`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${config.enabled ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/40"}`} />
        <span className="font-mono text-xs">
          {config.enabled
            ? `Heartbeat active — fires every ${config.interval_minutes} min during session`
            : "Heartbeat paused — will not fire"}
        </span>
        {config.updated_at && (
          <span className="ml-auto font-mono text-[10px] text-muted-foreground/50">
            Saved {new Date(config.updated_at).toLocaleString()}
          </span>
        )}
      </div>

      {/* Interval selector */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Interval</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {INTERVAL_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => save({ interval_minutes: m })}
              disabled={saving}
              className={`px-4 py-1.5 rounded-lg text-sm font-mono border transition-colors disabled:opacity-50 ${
                config.interval_minutes === m
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border/50 hover:border-border"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
        <p className="font-mono text-[10px] text-muted-foreground/50">
          How often the heartbeat fires within an active Claude Code session. Session-scoped — CronCreate runs on each session start.
        </p>
      </div>

      {/* Criteria textarea */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-3">
        <div>
          <p className="text-sm font-medium">Cycle Criteria</p>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
            Full prompt sent to Claude Code on each heartbeat. Customize to shift focus areas (e.g. night cycle: SEO, test coverage; day cycle: features, terminal pages).
          </p>
        </div>
        <textarea
          value={config.criteria}
          onChange={(e) => setConfig((c) => ({ ...c, criteria: e.target.value }))}
          rows={20}
          spellCheck={false}
          className="w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2.5 font-mono text-xs text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-accent/50 leading-relaxed"
          placeholder="Enter the full heartbeat prompt…"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] text-muted-foreground/50">
            {config.criteria.length.toLocaleString()} chars
          </span>
          <div className="flex items-center gap-2">
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1 text-red-400 text-xs font-mono">
                <AlertCircle className="h-3.5 w-3.5" /> {errorMsg}
              </span>
            )}
            <button
              type="button"
              onClick={() => save({})}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save criteria
            </button>
          </div>
        </div>
      </div>

      {/* Usage note */}
      <div className="rounded-lg border border-border/40 bg-card/20 p-4 space-y-1.5">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">How it works</p>
        <ul className="text-xs text-muted-foreground space-y-1 leading-relaxed">
          <li>1. Config saved here persists in Neon <code className="font-mono bg-muted/40 px-1 rounded">heartbeat_config</code> table.</li>
          <li>2. At the start of each Claude Code session, ask: <code className="font-mono bg-muted/40 px-1 rounded">start heartbeat from config</code> — Claude reads the DB and schedules the cron if enabled.</li>
          <li>3. The toggle here only persists intent. The actual cron lives in-session via CronCreate.</li>
          <li>4. Use different criteria for day vs night cycles — e.g. night: SEO/tests, day: features.</li>
        </ul>
      </div>
    </div>
  )
}
