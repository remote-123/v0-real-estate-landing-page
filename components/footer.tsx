"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
]

export function Footer() {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)

  function handleMiniLead(e: React.FormEvent) {
    e.preventDefault()
    if (email.trim()) setSubscribed(true)
  }

  return (
    <footer className="bg-primary py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link
              href="/"
              className="font-serif text-xl font-bold text-primary-foreground"
            >
              HorizonCapital
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/60">
              Your trusted gateway to premium UAE real estate investment.
              Licensed and regulated in Dubai.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-primary-foreground/40 uppercase">
              Quick Links
            </h4>
            <ul className="flex flex-col gap-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-primary-foreground/40 uppercase">
              Contact
            </h4>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Mail className="h-4 w-4 shrink-0" />
                info@horizoncapital.ae
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Phone className="h-4 w-4 shrink-0" />
                +971 4 123 4567
              </li>
              <li className="flex items-start gap-2 text-sm text-primary-foreground/70">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                Business Bay, Dubai, UAE
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-primary-foreground/40 uppercase">
              Stay Updated
            </h4>
            {subscribed ? (
              <p className="text-sm text-primary-foreground/70">
                Thank you for subscribing. We will be in touch.
              </p>
            ) : (
              <form onSubmit={handleMiniLead} className="flex flex-col gap-3">
                <p className="text-sm text-primary-foreground/60">
                  Get the latest Dubai investment insights delivered to your
                  inbox.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground placeholder:text-primary-foreground/40"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span className="sr-only">Subscribe</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/10 pt-8 md:flex-row">
          <p className="text-sm text-primary-foreground/40">
            &copy; {new Date().getFullYear()} HorizonCapital. All rights
            reserved.
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
              (label) => (
                <Link
                  key={label}
                  href="#"
                  className="text-xs text-primary-foreground/30 transition-colors hover:text-primary-foreground/60"
                >
                  {label}
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
