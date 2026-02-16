"use client"

import React from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { LeadForm } from "@/components/lead-form"

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Simple Hero: Sets the stage without competing with the form's text */}
        <section className="bg-primary pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="mx-auto max-w-7xl px-6">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Contact
            </p>
            <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              <span className="text-balance">
                Advisory & Strategy
              </span>
            </h1>
          </div>
        </section>

        {/* The LeadForm component already has a <section> with padding, 
          the 2-column grid, and the contact details inside it.
        */}
        <LeadForm />
      </main>
      <Footer />
    </>
  )
}