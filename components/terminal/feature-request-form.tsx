"use client"

import { useState, useMemo } from "react"
import { Send, CheckCircle, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function generateCaptcha() {
    const a = Math.floor(Math.random() * 9) + 1
    const b = Math.floor(Math.random() * 9) + 1
    const useAdd = Math.random() > 0.5
    return {
        question: useAdd ? `${a} + ${b}` : `${a + b} − ${b}`,
        answer: useAdd ? a + b : a,
    }
}

type Status = "idle" | "submitting" | "success" | "error"

export function FeatureRequestForm() {
    const captcha = useMemo(() => generateCaptcha(), [])
    const [idea, setIdea] = useState("")
    const [email, setEmail] = useState("")
    const [captchaInput, setCaptchaInput] = useState("")
    const [honeypot, setHoneypot] = useState("") // bots fill this
    const [status, setStatus] = useState<Status>("idle")
    const [errorMsg, setErrorMsg] = useState("")

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (honeypot) return // silently reject bots
        if (!idea.trim()) return

        setStatus("submitting")
        setErrorMsg("")

        const res = await fetch("/api/terminal/feature-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                idea: idea.trim(),
                email: email.trim() || null,
                captchaQuestion: captcha.question,
                captchaAnswer: captchaInput.trim(),
                captchaExpected: captcha.answer,
                hp: honeypot,
            }),
        })

        const data = await res.json()
        if (res.ok) {
            setStatus("success")
        } else {
            setStatus("error")
            setErrorMsg(data.error || "Something went wrong. Please try again.")
        }
    }

    if (status === "success") {
        return (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-semibold text-foreground">Request received</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                    We review every submission. If it gets traction, it ships. Thank you.
                </p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot — hidden from real users, bots fill it */}
            <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] opacity-0 pointer-events-none"
            />

            <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Your idea <span className="text-accent">*</span>
                </label>
                <textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="e.g. Add off-plan yield projections broken down by developer..."
                    maxLength={500}
                    rows={3}
                    required
                    className="w-full resize-none rounded-md border border-border/50 bg-background/50 px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all"
                />
                <p className="text-[10px] text-muted-foreground/40 text-right">{idea.length}/500</p>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Email <span className="text-muted-foreground/40 font-normal normal-case">(optional — if you want to be notified)</span>
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Quick check: what is {captcha.question}? <span className="text-accent">*</span>
                </label>
                <input
                    type="text"
                    inputMode="numeric"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="Answer"
                    required
                    maxLength={4}
                    className="w-28 rounded-md border border-border/50 bg-background/50 px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all"
                />
            </div>

            {errorMsg && (
                <p className="text-xs text-red-500">{errorMsg}</p>
            )}

            <Button
                type="submit"
                size="sm"
                disabled={status === "submitting" || !idea.trim() || !captchaInput}
                className={cn("gap-2 font-mono text-xs", status === "submitting" && "opacity-70")}
            >
                <Send className="h-3.5 w-3.5" />
                {status === "submitting" ? "Sending..." : "Submit Request"}
            </Button>
        </form>
    )
}
