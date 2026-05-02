"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Props {
  freeRows: number
  totalRows: number
  noun?: string
  callbackUrl?: string
}

type State = "idle" | "loading" | "success" | "error"

export function EmailGateOverlay({ freeRows, totalRows, noun = "rows", callbackUrl = "/terminal/communities" }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [state, setState] = useState<State>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setState("loading")
    setErrorMsg("")

    try {
      const res = await fetch("/api/leads/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: callbackUrl }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `HTTP ${res.status}`)
      }

      // Soft gate — cookie is client-settable by design
      document.cookie = "terminal_email_unlocked=1; max-age=86400; path=/; samesite=lax"
      setState("success")
      // Re-render server component to pick up new cookie and serve full rows
      router.refresh()
    } catch (err) {
      setState("error")
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong — try again.")
    }
  }

  return (
    <div className="relative">
      {/* Fade gradient over locked rows */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />

      {/* CTA card */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 pb-4 pt-8">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Lock className="h-4 w-4 text-accent" />
          <span>
            Showing <span className="font-semibold text-foreground">{freeRows}</span> of{" "}
            <span className="font-semibold text-foreground">{totalRows}</span> {noun}
          </span>
        </div>

        {state === "success" ? (
          <p className="text-sm text-emerald-400 font-medium">Unlocked — loading full data…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2 w-full max-w-xs">
            <div className="flex gap-2 w-full">
              <Input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={state === "loading"}
                className="h-8 text-sm bg-background/60"
              />
              <Button
                type="submit"
                size="sm"
                disabled={state === "loading"}
                className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
              >
                {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock"}
              </Button>
            </div>

            {state === "error" && (
              <p className="text-[11px] text-red-400">{errorMsg}</p>
            )}

            <p className="text-[11px] text-muted-foreground/60">
              Free — no spam.{" "}
              <Link href={`/sign-in?callbackUrl=${callbackUrl}`} className="underline underline-offset-2 hover:text-muted-foreground">
                Sign in instead →
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
