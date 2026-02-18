"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShieldCheck, Globe2 } from "lucide-react"

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden bg-primary pt-20">
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
        <div className="absolute inset-0 bg-foreground/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/40 z-10" />
        <img
          src="/images/hero-dubai-skyline.jpg" // Ensure you have a good background image here
          alt="Dubai Skyline"
          className="h-full w-full object-cover opacity-60"
        />
      </div>

      <div className="relative z-20 mx-auto max-w-7xl px-6 text-center md:text-left">
        <div className="grid gap-12 md:grid-cols-2 items-center">
          
          {/* Text Content */}
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wide text-accent">
                building wealth through real estate
              </span>
            </div>
            
            <h1 className="font-serif text-5xl font-bold leading-tight text-primary-foreground md:text-6xl lg:text-7xl">
              Dubai Real Estate.<br />
              <span className="text-accent">Zero Ambiguity.</span>
            </h1>
            
            <p className="max-w-xl text-lg text-primary-foreground/80 leading-relaxed">
              We bridge the gap between global capital and Dubai opportunity. 
              Experience institutional-grade advisory, independent due diligence, 
              and a seamless buying process—no matter where you reside.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                <Link href="/projects">
                  Explore Opportunities <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/20 text-black hover:bg-primary-foreground/10" asChild>
                <Link href="/contact">
                  Book Strategy Call
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4 text-sm text-primary-foreground/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span>RERA Licensed</span>
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
             {/* You can place a "Market Report" card or a "Founder Image" here later */}
          </div>

        </div>
      </div>
    </section>
  )
}