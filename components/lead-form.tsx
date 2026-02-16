"use client"

import React, { useState } from "react"
// components/lead-form.tsx

import { 
  Phone,
  Mail,    // Add this
  MapPin,  // Add this
  Clock    // Add this
} from "lucide-react"
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
import { ArrowRight, CheckCircle2, Calendar, ChevronLeft } from "lucide-react"

const countryCodes = [
  { code: "+1", label: "USA / CAN", flag: "🇺🇸/🇨🇦" },
  { code: "+91", label: "India", flag: "🇮🇳" },
  { code: "+44", label: "UK", flag: "🇬🇧" },
  { code: "+86", label: "China", flag: "🇨🇳" },
  { code: "+966", label: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+92", label: "Pakistan", flag: "🇵🇰" },
  { code: "+7", label: "Russia", flag: "🇷🇺" },
  { code: "+33", label: "France", flag: "🇫🇷" },
  { code: "+49", label: "Germany", flag: "🇩🇪" },
  { code: "+20", label: "Egypt", flag: "🇪🇬" },
  { code: "other", label: "Other", flag: "🌐" },
]

export function LeadForm() {
  const [step, setStep] = useState<"form" | "calendar">("form")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setLoading(true);
  
  const formData = new FormData(e.currentTarget);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      setLoading(false);
      setStep("calendar"); // Successfully saved to Sheet, now show Calendar
    } else {
      throw new Error("Failed to save data");
    }
  } catch (error) {
    setLoading(false);
    alert("There was an error saving your profile. Please try again.");
  }
}

  return (
    <section id="contact" className="bg-secondary py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className={`grid items-start gap-12 ${step === "form" ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          
          {/* Left Column - Only shows during form step */}
          {step === "form" && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            {/* Left Side: Boutique Advisory & Get In Touch */}
<div className="animate-in fade-in slide-in-from-left-4 duration-500">
  <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
    Boutique Advisory
  </p>
  <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Secure your private strategy session
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                We prepare custom ROI projections for every call. Share your goals to get started.
              </p>
              <ul className="mt-8 space-y-4">
                {["Direct off-market access", "Portfolio engineering", "North American due-diligence"].map((text) => (
                  <li key={text} className="flex items-center gap-3 text-sm font-medium">
                    <CheckCircle2 className="h-5 w-5 text-accent" /> {text}
                  </li>
                ))}
              </ul>

  {/* NEW: Get In Touch Section */}
  <div className="mt-12 space-y-8 border-t border-border pt-10">
    <h3 className="font-serif text-xl font-bold text-foreground">Get in Touch</h3>
    
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <Mail className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Email</p>
          <p className="font-medium text-foreground">ceo@northcapitaldxb.com</p>
        </div>
      </div>

        <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <Phone className="h-5 w-5 text-accent" />
            </div>
            <div>
              
              <p className="text-sm text-muted-foreground">
                +971 55 400 6230 <br />
                +1 (647) 703-9115 (Canada)
              </p>
            </div>
          </div>

      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <Clock className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Hours</p>
          <p className="font-medium text-foreground">Mon — Fri: 9AM - 6PM (GST)</p>
        </div>
      </div>
    </div>
  </div>
</div>
            </div>
          )}

          <div className={`rounded-xl border border-border bg-card shadow-lg transition-all duration-500 ${step === "calendar" ? "p-4 md:p-6 w-full max-w-4xl mx-auto" : "p-8 md:p-10"}`}>
            
            {step === "calendar" ? (
              <div className="animate-in fade-in zoom-in-95 duration-500">
                <div className="mb-6 flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="font-serif text-xl font-bold">Select a Time Slot</h3>
                    <p className="text-sm text-muted-foreground">Your profile has been saved successfully.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep("form")} className="text-muted-foreground">
                    <ChevronLeft className="mr-1 h-4 w-4" /> Edit Profile
                  </Button>
                </div>
                
                {/* Google Calendar Iframe Integration */}
                <div className="overflow-hidden rounded-lg bg-white">
                  <iframe 
                    src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ3Oba6IoSYm1-5yxUHZN9bx5zcFglpgSfVkN62KmQ2Ietc4Wi8dM_QPrsWFMkgEOHRyTz513PdU?gv=true" 
                    style={{ border: 0 }} 
                    width="100%" 
                    height="600" 
                    frameBorder="0"
                  />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input name="firstName" placeholder="First Name" required className="bg-background" />
                  <Input name="lastName" placeholder="Last Name" required className="bg-background" />
                </div>
                <Input name="email" type="email" placeholder="Email Address" required className="bg-background" />
                
                <div className="flex gap-2">
                  <Select name="countryCode" defaultValue="+1">
                    <SelectTrigger className="w-[130px] bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.code === "other" ? "Other" : c.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input name="phone" type="tel" placeholder="Phone Number" className="flex-1 bg-background" required />
                </div>

                <div className="space-y-4 pt-2">
                  <div className="grid gap-2">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Investment Budget</Label>
                    <Select name="budget" required>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Select Range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1m-3m">AED 1M - 3M</SelectItem>
                        <SelectItem value="3m-10m">AED 3M - 10M</SelectItem>
                        <SelectItem value="10m+">AED 10M+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Primary Goal</Label>
                    <Select name="goal" required>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Primary Priority" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yield">Passive Income</SelectItem>
                        <SelectItem value="appreciation">Capital Growth</SelectItem>
                        <SelectItem value="visa">Golden Visa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Investment Timeline</Label>
                    <Select name="timeline" required>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Ready to deploy?" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="3-6-months">3-6 Months</SelectItem>
                        <SelectItem value="research">Researching</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" size="lg" disabled={loading} className="mt-4 bg-accent">
                  {loading ? "Saving Profile..." : "Submit & Book Time Slot"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}