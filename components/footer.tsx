"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Mail, Phone, MapPin, ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SITE_CONFIG, NAV_LINKS } from "@/lib/constants"


export function Footer() {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)

  async function handleMiniLead(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    // Reusing your API route to capture newsletter signups in your Google Sheet
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: "Newsletter Signup" }),
      })
      setSubscribed(true)
    } catch (error) {
      console.error("Signup failed", error)
    }
  }

  return (
    <footer className="bg-primary py-16 text-primary-foreground border-t border-primary-foreground/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Brand Info */}
          <div>
            <Link href="/" className="font-serif text-2xl font-bold tracking-tight">
              {SITE_CONFIG.name}
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/60 max-w-xs">
              Direct access to Dubai&apos;s most lucrative off-market opportunities, 
              vetted against historical data with unprecedented forcasting 
            </p>
          </div>

          {/* Navigation */}
         <div>
          <h4 className="mb-6 text-xs font-bold tracking-widest text-accent uppercase">
            Navigation
          </h4>
          {/* Using a grid with 2 columns specifically for the links */}
          <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm text-primary-foreground/70 transition-colors hover:text-accent duration-200 block"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

          {/* Contact Details */}
          <div>
            <h4 className="mb-6 text-xs font-bold tracking-widest text-accent uppercase">
              The Office
            </h4>
            <ul className="flex flex-col gap-4">
              <li className="flex items-start gap-3 text-sm text-primary-foreground/70">
                <Mail className="h-4 w-4 shrink-0 text-accent" />
                <a href={`mailto:${SITE_CONFIG.email}`} className="hover:text-primary-foreground">
                  {SITE_CONFIG.email}
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-primary-foreground/70">
                <Phone className="h-4 w-4 shrink-0 text-accent" />
                <span>{SITE_CONFIG.phone}</span>
                <span>{SITE_CONFIG.phone2}</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-primary-foreground/70 leading-relaxed">
                <MapPin className="h-4 w-4 shrink-0 text-accent" />
                <span>{SITE_CONFIG.address}</span>
                <span>{SITE_CONFIG.address2}</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="mb-6 text-xs font-bold tracking-widest text-accent uppercase">
              Market Intelligence
            </h4>
            {subscribed ? (
              <div className="flex items-center gap-2 text-sm text-accent">
                <ShieldCheck className="h-4 w-4" />
                <span>Intelligence Briefing Subscribed.</span>
              </div>
            ) : (
              <form onSubmit={handleMiniLead} className="flex flex-col gap-4">
                <p className="text-sm text-primary-foreground/60 italic">
                  Join our list for monthly yield reports and ROI analysis.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground placeholder:text-primary-foreground/40"
                  />
                  <Button type="submit" size="icon" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Legal Section */}
        <div className="mt-16 pt-8 border-t border-primary-foreground/10">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-[10px] leading-relaxed text-primary-foreground/30 uppercase tracking-widest font-bold">
                Professional Disclaimer & Regulatory Status
              </p>
              <p className="mt-2 text-xs leading-relaxed text-primary-foreground/40 max-w-2xl">
                &copy; {new Date().getFullYear()} {SITE_CONFIG.name}. North Capital DXB is an independent advisory brand. 
                All real estate transactions are executed through our brokerage & development partners.
              </p>
            </div>
            
            <div className="flex flex-col md:items-end justify-center gap-4">
              <div className="flex gap-6">
                {["Privacy", "Terms", "Cookies"].map((label) => (
                  <Link key={label} href="#" className="text-[10px] uppercase font-bold text-primary-foreground/20 hover:text-accent transition-colors">
                    {label}
                  </Link>
                ))}
              </div>
              <p className="text-[10px] text-primary-foreground/20">
                Crafted for Global Investors.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}