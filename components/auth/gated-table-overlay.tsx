"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  freeRows: number
  totalRows: number
  noun?: string
  callbackUrl?: string
}

export function GatedTableOverlay({ freeRows, totalRows, noun = "rows", callbackUrl = "/terminal/communities" }: Props) {
  return (
    <div className="relative">
      {/* Fade gradient covering hidden rows */}
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
        <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
          <Link href={`/sign-in?callbackUrl=${callbackUrl}`}>
            Sign in free to unlock all data
          </Link>
        </Button>
        <p className="text-[11px] text-muted-foreground/60">No credit card · Google or LinkedIn · 10 seconds</p>
      </div>
    </div>
  )
}
