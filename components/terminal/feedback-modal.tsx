"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Lightbulb, X, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  return { question: `${a} + ${b}`, answer: a + b }
}

export function FeedbackModal() {
  const [open, setOpen] = useState(false)
  const [idea, setIdea] = useState("")
  const [email, setEmail] = useState("")
  const [captchaAnswer, setCaptchaAnswer] = useState("")
  const [captcha, setCaptcha] = useState(() => generateCaptcha())
  const [hp, setHp] = useState("") // honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setIdea("")
      setEmail("")
      setCaptchaAnswer("")
      setCaptcha(generateCaptcha())
      setStatus("idle")
      setErrorMsg("")
    }
  }, [open])

  // Lock body scroll + close on Escape
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", handler)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", handler)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    setErrorMsg("")

    try {
      const res = await fetch("/api/terminal/feature-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          email,
          captchaQuestion: captcha.question,
          captchaAnswer,
          captchaExpected: captcha.answer,
          hp,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.")
        setStatus("error")
        setCaptcha(generateCaptcha())
        setCaptchaAnswer("")
      } else {
        setStatus("success")
      }
    } catch {
      setErrorMsg("Network error. Please try again.")
      setStatus("error")
    }
  }

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="rounded-full"
        aria-label="Share feedback or feature request"
      >
        <Lightbulb className="h-4 w-4" />
      </Button>

      {/* Backdrop + modal — portalled to body to escape backdrop-filter containing block */}
      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Panel */}
          <div className="relative w-full max-w-md rounded-xl border border-border/60 bg-card shadow-2xl max-h-[85dvh] overflow-y-auto overscroll-contain">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-400" />
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-foreground">
                  Feature Request
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {status === "success" ? (
              <div className="px-5 py-10 text-center space-y-2">
                <p className="text-2xl">💡</p>
                <p className="font-medium text-foreground">Got it — thanks!</p>
                <p className="text-sm text-muted-foreground">
                  Your idea has been sent. We review every submission.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setOpen(false)}
                >
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  What data, metric, or feature would make this terminal more useful for you?
                </p>

                {/* Honeypot — hidden from humans */}
                <input
                  type="text"
                  name="website"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                />

                {/* Idea */}
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Your idea <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    rows={4}
                    maxLength={500}
                    required
                    placeholder="e.g. Show yield by building age, or add a mortgage calculator…"
                    className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
                  />
                  <p className="text-right font-mono text-[10px] text-muted-foreground/50">
                    {idea.length}/500
                  </p>
                </div>

                {/* Email (optional) */}
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Email <span className="text-muted-foreground/40">(optional — for updates)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>

                {/* Math captcha */}
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Quick check: {captcha.question} = ?{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    required
                    placeholder="Answer"
                    className="w-28 rounded-md border border-border/50 bg-background px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>

                {/* Error */}
                {status === "error" && errorMsg && (
                  <p className="text-xs text-red-400">{errorMsg}</p>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={status === "loading" || idea.trim().length < 10}
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {status === "loading" ? "Sending…" : "Send Idea"}
                </Button>
              </form>
            )}
          </div>
        </div>
      , document.body)}
    </>
  )
}
