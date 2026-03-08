"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowRight, CheckCircle2 } from "lucide-react"

const hearAboutOptions = [
  { value: "google", label: "Google Search" },
  { value: "x-twitter", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "referral", label: "Friend / Referral" },
  { value: "youtube", label: "YouTube" },
  { value: "other", label: "Other" },
]

interface BlogAdvisorFormProps {
  postTitle?: string
}

export function BlogAdvisorForm({ postTitle }: BlogAdvisorFormProps) {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const payload = Object.fromEntries(formData.entries())

    // Fire and forget — keepalive ensures it completes even as UI updates
    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        source: "Blog Sidebar",
        interestedProject: postTitle ? `Blog: ${postTitle}` : "Blog",
      }),
      keepalive: true,
    }).catch(() => {}) // silent fail

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-accent" />
        <p className="font-serif text-lg font-bold text-foreground">
          Message received.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          One of our advisors will be in touch within 24 hours.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Input
          name="firstName"
          placeholder="First Name"
          required
          className="bg-background text-sm"
        />
        <Input
          name="lastName"
          placeholder="Last Name"
          required
          className="bg-background text-sm"
        />
      </div>

      <Input
        name="email"
        type="email"
        placeholder="Email Address"
        required
        className="bg-background text-sm"
      />

      <Input
        name="phone"
        type="tel"
        placeholder="Phone (optional)"
        className="bg-background text-sm"
      />

      <Select name="hearAbout" required>
        <SelectTrigger className="bg-background text-sm">
          <SelectValue placeholder="How did you hear about us?" />
        </SelectTrigger>
        <SelectContent>
          {hearAboutOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="submit"
        className="mt-1 w-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        Speak to an Advisor
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <p className="text-center text-[10px] text-muted-foreground">
        We respond within 24 hours. No spam, ever.
      </p>
    </form>
  )
}
