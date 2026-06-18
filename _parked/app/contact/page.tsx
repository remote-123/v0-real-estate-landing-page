"use client"

import React from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { LeadForm } from "@/components/lead-form"

export default function ContactPage() {
  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact North Capital DXB",
    "description": "Speak to an institutional-grade investment strategy advisor in Dubai.",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.northcapitaldxb.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Contact",
          "item": "https://www.northcapitaldxb.com/contact"
        }
      ]
    },
    "mainEntity": {
      "@type": "Organization",
      "name": "North Capital DXB",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "areaServed": "Global",
        "availableLanguage": ["English", "Arabic"]
      }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />
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