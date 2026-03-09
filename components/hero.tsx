"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShieldCheck, Globe2, Terminal } from "lucide-react"

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden bg-slate-950 pt-20">
      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-dubai.jpg"
          alt="Panoramic view of the Dubai skyline at golden hour"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        {/* FIXED: Hardcoded black overlays so it never turns white in dark mode */}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent z-10" />
      </div>

      <div className="relative z-20 mx-auto w-full max-w-7xl px-6 text-center md:text-left">
        <div className="grid gap-12 md:grid-cols-2 items-center">
          
          {/* Text Content */}
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wide text-accent">
                building wealth through real estate
              </span>
            </div>
            
            {/* FIXED: Enforced text-white so it's always readable against the dark image */}
            <h1 className="font-serif text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
              Institutional-Grade Real Estate Advisory for <br />
              <span className="text-accent">Global Capital</span>
            </h1>
            
            <p className="max-w-xl text-lg text-white/80 leading-relaxed">
              We structure high-yield, tax-free property portfolios in Dubai for seasoned investors and global expats. Our analysis relies on supply-side metrics, currency hedging, and strict capital preservation—gatekeeping only the assets that pass our internal stress tests.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 border-0" asChild>
                <Link href="/projects">
                  Explore Opportunities <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {/* FIXED: Changed text-black to text-white for the secondary button */}
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent" asChild>
                <Link href="/contact">
                  Request Strategy Session
                </Link>
              </Button>
              {/* Terminal CTA — premium, data-forward */}
              <Button
                size="lg"
                variant="outline"
                className="relative border-emerald-500/40 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 bg-black/40 backdrop-blur-sm font-mono tracking-tight group overflow-hidden"
                asChild
              >
                <Link href="/terminal">
                  <span className="absolute inset-0 rounded-[inherit] ring-1 ring-emerald-500/20 group-hover:ring-emerald-400/40 transition-all duration-300" />
                  <span className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Terminal className="mr-2 h-4 w-4 shrink-0" />
                  <span className="relative">Market Intelligence</span>
                  <span className="ml-1.5 inline-block w-px h-3.5 bg-emerald-400 animate-[blink_1.1s_step-end_infinite] self-center" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span>RERA Licensed · Broker #95133</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-accent" />
                <span>Multi-Currency Support</span>
              </div>
            </div>
          </div>

          {/* Optional: Right Side Visual (Stats or Founder Image) */}
          <div className="hidden md:block relative">
             <div className="absolute -inset-4 rounded-full bg-accent/20 blur-3xl opacity-50"></div>
          </div>

        </div>
      </div>
    </section>
  )
}