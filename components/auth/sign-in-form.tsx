"use client"

import { signIn } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  callbackUrl?: string
}

export function SignInForm({ callbackUrl = "/terminal/communities" }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSignIn(provider: string) {
    setLoading(provider)
    await signIn(provider, { callbackUrl })
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo / brand */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-block">
          <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
            North Capital DXB
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Unlock the Terminal</h1>
        <p className="text-sm text-muted-foreground">
          Free access to all Dubai market intelligence. Sign in in 10 seconds.
        </p>
      </div>

      {/* Benefits */}
      <ul className="space-y-1.5 text-sm text-muted-foreground border border-border/50 rounded-xl p-4 bg-card">
        {[
          "80+ Dubai communities ranked by yield & velocity",
          "Building-level PSF trends and service charges",
          "Off-plan pipeline and supply forecasts",
          "Distress deal scanner with discount %%",
        ].map(b => (
          <li key={b} className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {/* Sign-in buttons */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full gap-3 h-11"
          disabled={loading !== null}
          onClick={() => handleSignIn("google")}
        >
          {loading === "google" ? (
            <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Continue with Google
        </Button>

      </div>

      <p className="text-center text-[11px] text-muted-foreground/60">
        By signing in you agree to our{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-muted-foreground">
          Privacy Policy
        </Link>
        . We never spam or sell your data.
      </p>
    </div>
  )
}
