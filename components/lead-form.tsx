"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, CheckCircle2 } from "lucide-react"

export function LeadForm() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section id="contact" className="bg-secondary py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Get Started
            </p>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              <span className="text-balance">
                Book your free investment consultation
              </span>
            </h2>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
              Speak with a dedicated UAE property advisor. No obligations, no
              hidden fees -- just expert guidance tailored to your investment
              goals.
            </p>

            <ul className="mt-8 flex flex-col gap-4">
              {[
                "Personalized property shortlist",
                "ROI projections and market analysis",
                "Legal and financing guidance",
                "Virtual or in-person property tours",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-foreground"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-8 shadow-lg md:p-10">
            {submitted ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                  <CheckCircle2 className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-card-foreground">
                  Thank you!
                </h3>
                <p className="max-w-sm text-muted-foreground">
                  A member of our team will reach out within 24 hours to
                  schedule your consultation.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="budget">Investment Budget</Label>
                  <Select>
                    <SelectTrigger id="budget">
                      <SelectValue placeholder="Select your budget range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500k-1m">AED 500K - 1M</SelectItem>
                      <SelectItem value="1m-3m">AED 1M - 3M</SelectItem>
                      <SelectItem value="3m-5m">AED 3M - 5M</SelectItem>
                      <SelectItem value="5m-10m">AED 5M - 10M</SelectItem>
                      <SelectItem value="10m+">AED 10M+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="message">
                    Message{" "}
                    <span className="text-muted-foreground">(Optional)</span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your investment goals..."
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-2 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Book a Free Consultation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  By submitting, you agree to our privacy policy. We will never
                  share your information with third parties.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
