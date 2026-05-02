"use client"

import { useState } from "react"
import { Mail, CheckCircle, Loader2 } from "lucide-react"

interface EmailCaptureWidgetProps {
  /** Which page or feature the user is on — stored in email_leads.source */
  source?: string
  /** Area the user is currently viewing — stored in email_leads.area_interest */
  areaInterest?: string
  /** Override the default CTA label */
  label?: string
}

type Status = "idle" | "loading" | "success" | "error" | "already"

export function EmailCaptureWidget({
  source = "terminal",
  areaInterest,
  label = "Get weekly distress deal alerts",
}: EmailCaptureWidgetProps) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === "loading") return

    setStatus("loading")
    setErrorMsg("")

    try {
      const res = await fetch("/api/leads/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          source,
          area_interest: areaInterest ?? null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong — try again")
        setStatus("error")
        return
      }

      setStatus(data.already_subscribed ? "already" : "success")
    } catch {
      setErrorMsg("Network error — please try again")
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
        <CheckCircle className="h-4 w-4 shrink-0 text-accent" />
        <p className="text-sm text-accent font-medium">
          You&apos;re in. First digest lands Monday.
        </p>
      </div>
    )
  }

  if (status === "already") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
        <CheckCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          You&apos;re already subscribed.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border/40 bg-card/60 px-4 py-3 space-y-2"
    >
      <div className="flex items-center gap-2">
        <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className="flex-1 min-w-0 rounded-md border border-border/50 bg-background/60 px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading" || !email.trim()}
          className="shrink-0 flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Subscribe"
          )}
        </button>
      </div>

      {status === "error" && (
        <p className="text-[11px] text-red-400">{errorMsg}</p>
      )}

      <p className="text-[10px] text-muted-foreground/50">
        Weekly only. No spam. Unsubscribe anytime.
      </p>
    </form>
  )
}
