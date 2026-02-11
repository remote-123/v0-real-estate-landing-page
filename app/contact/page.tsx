"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
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
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Clock,
  Calendar,
} from "lucide-react"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-primary pt-32 pb-20 md:pt-40 md:pb-28">
          <div className="mx-auto max-w-7xl px-6">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Contact Us
            </p>
            <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              <span className="text-balance">
                Let&apos;s start your investment journey
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-primary-foreground/70">
              Book a free, no-obligation consultation with one of our UAE
              property experts. We respond within 24 hours.
            </p>
          </div>
        </section>

        {/* Form + Info */}
        <section className="bg-background py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid items-start gap-12 lg:grid-cols-5">
              {/* Contact Info */}
              <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold text-foreground">
                  Get in Touch
                </h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  Whether you are a first-time investor or adding to your
                  portfolio, our advisors are here to help you make informed
                  decisions.
                </p>

                <div className="mt-10 flex flex-col gap-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <Mail className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Email</p>
                      <p className="text-sm text-muted-foreground">
                        info@horizoncapital.ae
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <Phone className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Phone</p>
                      <p className="text-sm text-muted-foreground">
                        +971 4 123 4567
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <MapPin className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Office</p>
                      <p className="text-sm text-muted-foreground">
                        Business Bay, Dubai, UAE
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <Clock className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Hours</p>
                      <p className="text-sm text-muted-foreground">
                        Sun - Thu: 9:00 AM - 6:00 PM (GST)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Calendly Placeholder */}
                <div className="mt-10 rounded-xl border border-border bg-secondary p-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-accent" />
                    <h3 className="font-semibold text-foreground">
                      Prefer a scheduled call?
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Book a time that works for you directly through our
                    scheduling tool.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 bg-transparent"
                    asChild
                  >
                    <Link href="#">Schedule a Call</Link>
                  </Button>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-3">
                <div className="rounded-xl border border-border bg-card p-8 shadow-lg md:p-10">
                  {submitted ? (
                    <div className="flex flex-col items-center gap-4 py-16 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                        <CheckCircle2 className="h-8 w-8 text-accent" />
                      </div>
                      <h3 className="font-serif text-2xl font-bold text-card-foreground">
                        Thank you for reaching out!
                      </h3>
                      <p className="max-w-sm text-muted-foreground">
                        A member of our team will contact you within 24 hours to
                        schedule your free consultation.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4 bg-transparent"
                        onClick={() => setSubmitted(false)}
                      >
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                      <h3 className="font-serif text-xl font-bold text-card-foreground">
                        Book Your Free Consultation
                      </h3>

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
                            <SelectItem value="under-500k">
                              Under AED 500K
                            </SelectItem>
                            <SelectItem value="500k-1m">
                              AED 500K - 1M
                            </SelectItem>
                            <SelectItem value="1m-3m">AED 1M - 3M</SelectItem>
                            <SelectItem value="3m-5m">AED 3M - 5M</SelectItem>
                            <SelectItem value="5m-10m">
                              AED 5M - 10M
                            </SelectItem>
                            <SelectItem value="10m+">AED 10M+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="message">
                          Message{" "}
                          <span className="text-muted-foreground">
                            (Optional)
                          </span>
                        </Label>
                        <Textarea
                          id="message"
                          placeholder="Tell us about your investment goals, timeline, or any questions..."
                          rows={4}
                        />
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="mt-2 bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        Submit Enquiry
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>

                      <p className="text-center text-xs text-muted-foreground">
                        By submitting, you agree to our privacy policy. We will
                        never share your information with third parties.
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
