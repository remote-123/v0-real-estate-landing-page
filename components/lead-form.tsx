"use client"

import React, { useState } from "react"
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
import {
  ArrowRight,
  Mail,
  MapPin,
  Clock,
  Calendar,
  ChevronLeft,
} from "lucide-react"
import { SITE_CONFIG } from "@/lib/constants"
import { cn } from "@/lib/utils"

// Top 10 Investor Nationalities
const countryCodes = [
  { code: "+1", label: "USA / CAN", flag: "🇺🇸/🇨🇦" },
  { code: "+971", label: "UAE", flag: "🇦🇪" },
  { code: "+44", label: "UK", flag: "🇬🇧" },
  { code: "+91", label: "India", flag: "🇮🇳" },
  { code: "+86", label: "China", flag: "🇨🇳" },
  { code: "+966", label: "KSA", flag: "🇸🇦" },
  { code: "+7", label: "Russia", flag: "🇷🇺" },
  { code: "+33", label: "France", flag: "🇫🇷" },
  { code: "other", label: "Other", flag: "🌐" },
]

interface LeadFormProps {
  minimal?: boolean // NEW: Prop to control layout
  className?: string
}

export function LeadForm({ minimal = false, className }: LeadFormProps) {
  const [step, setStep] = useState<"form" | "calendar">("form")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const payload = Object.fromEntries(formData.entries())

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setLoading(false)
        setStep("calendar")
      }
    } catch (error) {
      setLoading(false);
      alert("Error saving data.");
    }
  }

  // THE FORM CONTENT (Reusable)
  const FormContent = (
    <div className={cn("bg-card h-full", !minimal && "rounded-xl border border-border p-8 shadow-lg", className)}>
      {step === "calendar" ? (
         <div className="animate-in fade-in zoom-in-95 duration-500 h-full">
            <div className="mb-4 flex items-center justify-between border-b pb-4">
              <h3 className="font-serif text-lg font-bold">Select a Time</h3>
              <Button variant="ghost" size="sm" onClick={() => setStep("form")} className="h-8 text-xs">
                <ChevronLeft className="mr-1 h-3 w-3" /> Back
              </Button>
            </div>
            <iframe 
              src={SITE_CONFIG.calendarLink}
              style={{ border: 0 }} 
              width="100%" 
              height="400" 
            />
         </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!minimal && <h3 className="font-serif text-xl font-bold">Advisory Profile</h3>}
          
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="firstName" placeholder="First Name" required className="bg-background" />
            <Input name="lastName" placeholder="Last Name" required className="bg-background" />
          </div>

          <Input name="email" type="email" placeholder="Email Address" required className="bg-background" />

          <div className="flex gap-2">
            <Select name="countryCode" defaultValue="+1">
              <SelectTrigger className="w-[100px] bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {countryCodes.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.flag} {c.code === "other" ? "" : c.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input name="phone" type="tel" placeholder="Phone Number" className="flex-1 bg-background" required />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
             <Select name="budget" required>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Budget Range" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m-3m">AED 1M - 3M</SelectItem>
                  <SelectItem value="3m-10m">AED 3M - 10M</SelectItem>
                  <SelectItem value="10m+">AED 10M+</SelectItem>
                </SelectContent>
              </Select>
              <Select name="goal" required>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Goal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yield">Passive Income</SelectItem>
                  <SelectItem value="growth">Capital Growth</SelectItem>
                  <SelectItem value="residence">Personal Use</SelectItem>
                </SelectContent>
              </Select>
          </div>

          <Button type="submit" size="lg" disabled={loading} className="mt-2 bg-accent text-accent-foreground w-full">
            {loading ? "Processing..." : "View Factsheet & Book Call"}
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
          
          <p className="text-center text-[10px] text-muted-foreground">
            Your data is secure. We do not share info with 3rd parties.
          </p>
        </form>
      )}
    </div>
  )

  // If minimal (Popup mode), just return the form without the section wrapper
  if (minimal) return FormContent

  // Default (Contact Page mode) - Returns the full Section with Left Side info
  return (
    <section id="contact" className="bg-secondary py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-start gap-12 lg:grid-cols-5">
          {/* Left Side: Boutique Advisory */}
          <div className="lg:col-span-2">
             <p className="mb-3 text-sm font-semibold text-accent uppercase">Boutique Advisory</p>
             <h2 className="font-serif text-3xl font-bold">Secure your private strategy session</h2>
             <div className="mt-12 space-y-8 border-t border-border/20 pt-10">
                <div className="flex gap-4">
                   <div className="bg-accent/10 p-2 rounded-lg"><Mail className="h-5 w-5 text-accent"/></div>
                   <div><p className="text-xs font-bold uppercase text-muted-foreground">Email</p><p>{SITE_CONFIG.email}</p></div>
                </div>
                 <div className="flex gap-4">
                   <div className="bg-accent/10 p-2 rounded-lg"><MapPin className="h-5 w-5 text-accent"/></div>
                   <div><p className="text-xs font-bold uppercase text-muted-foreground">Office</p><p>{SITE_CONFIG.address}</p></div>
                </div>
             </div>
          </div>

          {/* Right Side: The Form */}
          <div className="lg:col-span-3">
            {FormContent}
          </div>
        </div>
      </div>
    </section>
  )
}