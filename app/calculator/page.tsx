"use client"

import React, { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { ArrowRight, ArrowLeft, Calculator, CheckCircle2, Clock, CalendarDays } from "lucide-react"

// Approximate Exchange Rates
const exchangeRates: Record<string, number> = {
  AED: 1, USD: 3.67, GBP: 4.65, EUR: 3.95, CAD: 2.70, AUD: 2.40, 
  CHF: 4.15, INR: 0.044, PKR: 0.013, RUB: 0.040, CNY: 0.51, SAR: 0.98, EGP: 0.075, TRY: 0.11,
}

// 24% Downpayment Business Rules separated by Intent
const propertyTiers = [
  { id: 5, name: "Waterfront Apartment", total: 2800000, requiredCash: 672000, location: "Dubai Marina/Creek", intent: "rental" },
  { id: 4, name: "Entry Villa", total: 2500000, requiredCash: 600000, location: "Dubai Suburbs", intent: "live" },
  { id: 3, name: "Dubai 1-Bedroom", total: 1200000, requiredCash: 288000, location: "Dubai", intent: "both" },
  { id: 2, name: "Dubai Studio", total: 650000, requiredCash: 156000, location: "Dubai", intent: "both" },
  { id: 1, name: "Ajman Starter", total: 350000, requiredCash: 84000, location: "Ajman", intent: "both" },
]

export default function AffordabilityCalculator() {
  const [currency, setCurrency] = useState("USD")
  const [goal, setGoal] = useState("rental")
  
  // Slider states
  const [savingsInput, setSavingsInput] = useState(50000)
  const [incomeInput, setIncomeInput] = useState(2000)
  
  // Form states
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  
  const [hasCalculated, setHasCalculated] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dynamic bounds
  const maxSavings = Math.round(5000000 / exchangeRates[currency])
  const maxIncome = Math.round(150000 / exchangeRates[currency])

  // Math Logic
  const savingsAED = savingsInput * exchangeRates[currency]
  const incomeAED = incomeInput * exchangeRates[currency]

  // Filter & Sort Tiers
  const relevantTiers = propertyTiers
    .filter(t => t.intent === goal || t.intent === "both")
    .sort((a, b) => b.requiredCash - a.requiredCash)

  const affordableTier = relevantTiers.find(tier => savingsAED >= tier.requiredCash)
  const lowestTier = relevantTiers[relevantTiers.length - 1]
  
  const shortfallAED = lowestTier.requiredCash - savingsAED
  const monthsToSave = incomeAED > 0 ? Math.ceil(shortfallAED / incomeAED) : "Infinite"

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency)
    setSavingsInput(0)
    setIncomeInput(0)
    setHasCalculated(false)
    setShowContactForm(false) 
  }

const submitLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true) // Changes button text instantly
    
    // 1. Fire the data to Google Sheets in the background (No 'await')
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: name,
        email: email,
        phone: phone,
        budget: affordableTier ? `${affordableTier.name} (AED ${affordableTier.total})` : `Shortfall (AED ${shortfallAED})`,
        goal: goal,
        source: "Affordability Calculator",
      }),
      keepalive: true, // <--- THE MAGIC FLAG: Ensures the request finishes even during redirect
    }).catch(error => console.error("Background capture failed:", error))

    // 2. Redirect IMMEDIATELY (0 second wait time)
    // REPLACE THIS WITH YOUR ACTUAL CALENDLY LINK
    window.location.href = "https://calendar.app.google/3qv6x8vt8NHvio9U9" 
  }

  return (
    <>
      <Navbar />
      <main className="bg-secondary/30 pt-32 pb-20 min-h-screen">
        <div className="mx-auto max-w-4xl px-6">
          
          <div className="text-center mb-10">
            <h1 className="font-serif text-4xl font-bold md:text-5xl">Can I Afford UAE Real Estate?</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Adjust your liquid capital and income below to see your exact purchasing power.
            </p>
          </div>

          <Card className="shadow-xl border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2">
                
                {/* LEFT COLUMN: THE INPUTS */}
                <div className="p-8 bg-card border-r border-border relative z-10">
                  <form onSubmit={(e) => { e.preventDefault(); setHasCalculated(true); setShowContactForm(false); }} className="space-y-8">
                    
                    <div className="space-y-3">
                      <Label>What is your primary goal?</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => {setGoal("rental"); setHasCalculated(false)}} className={`p-3 border rounded-lg text-sm font-medium transition-colors ${goal === "rental" ? "border-accent bg-accent/10 text-accent" : "border-border hover:bg-secondary"}`}>
                          Rental Income
                        </button>
                        <button type="button" onClick={() => {setGoal("live"); setHasCalculated(false)}} className={`p-3 border rounded-lg text-sm font-medium transition-colors ${goal === "live" ? "border-accent bg-accent/10 text-accent" : "border-border hover:bg-secondary"}`}>
                          Live In It
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>What currency are you paying in?</Label>
                      <Select value={currency} onValueChange={handleCurrencyChange}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.keys(exchangeRates).map(cur => (
                            <SelectItem key={cur} value={cur}>{cur}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-5">
                      <div className="flex justify-between items-center">
                        <Label>Total Liquid Savings</Label>
                        <span className="font-bold text-lg">{savingsInput.toLocaleString()} {currency}</span>
                      </div>
                      <Slider max={maxSavings} step={maxSavings / 100} value={[savingsInput]} onValueChange={(val) => setSavingsInput(val[0])} />
                    </div>

                    <div className="space-y-5">
                      <div className="flex justify-between items-center">
                        <Label>Monthly Disposable Income</Label>
                        <span className="font-bold text-lg">{incomeInput.toLocaleString()} {currency}</span>
                      </div>
                      <Slider max={maxIncome} step={maxIncome / 100} value={[incomeInput]} onValueChange={(val) => setIncomeInput(val[0])} />
                    </div>

                    <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90 h-12 text-lg shadow-md">
                      <Calculator className="mr-2 h-5 w-5" /> Calculate My Power
                    </Button>

                  </form>
                </div>

                {/* RIGHT COLUMN: SLIDING VIEWPORT */}
                <div className="relative bg-muted/30 overflow-hidden min-h-[500px]">
                  
                  {/* LAYER 1: THE RESULTS */}
                  <div className={`absolute inset-0 p-8 flex flex-col justify-center transition-transform duration-500 ease-in-out ${showContactForm ? '-translate-x-full' : 'translate-x-0'}`}>
                    {!hasCalculated ? (
                      <div className="text-center text-muted-foreground">
                        <Calculator className="mx-auto h-12 w-12 mb-4 opacity-20" />
                        <p>Adjust the sliders and calculate to see your UAE real estate purchasing power.</p>
                      </div>
                    ) : affordableTier ? (
                      <div className="animate-in fade-in zoom-in-95 space-y-6">
                        <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                          <CheckCircle2 className="h-4 w-4" /> You are ready to invest!
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Your Target Asset</p>
                          <h3 className="font-serif text-3xl font-bold text-foreground mt-1">{affordableTier.name}</h3>
                          <p className="text-lg text-accent font-medium mt-1">AED {(affordableTier.total / 1000000).toFixed(2)}M - AED {(affordableTier.total / 1000).toFixed(0)}k</p>
                        </div>
                        <Button onClick={() => setShowContactForm(true)} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 mt-4 shadow-md h-12 text-md">
                          Continue to Roadmap <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="animate-in fade-in zoom-in-95 space-y-6">
                        <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">
                          <Clock className="h-4 w-4" /> You are on the right path.
                        </div>
                        <div>
                          <h3 className="font-serif text-2xl font-bold text-foreground mt-1">
                            You are {monthsToSave} months away.
                          </h3>
                          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                            To enter the market with an {lowestTier.name}, you need AED {lowestTier.requiredCash.toLocaleString()} in cash to cover the 20% downpayment and 4% DLD fees.
                          </p>
                        </div>
                        <Button onClick={() => setShowContactForm(true)} className="w-full bg-foreground text-background hover:bg-foreground/90 mt-4 shadow-md h-12 text-md">
                           Continue to Roadmap <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* LAYER 2: THE CONTACT FORM */}
                  <div className={`absolute inset-0 p-8 bg-card flex flex-col justify-center transition-transform duration-500 ease-in-out ${showContactForm ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="h-full flex flex-col justify-between">
                      <div>
                        <Button variant="ghost" size="sm" onClick={() => setShowContactForm(false)} className="mb-4 -ml-3 text-muted-foreground hover:text-foreground">
                          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Results
                        </Button>
                        <h3 className="font-serif text-2xl font-bold mb-2">Let's lock in your plan.</h3>
                        <p className="text-sm text-muted-foreground mb-6">Enter your details to schedule a quick consultation and get your tailored market roadmap.</p>
                        
                        <form onSubmit={submitLead} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" required placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" type="email" required placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number (WhatsApp)</Label>
                            <Input id="phone" type="tel" required placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                          </div>
                          <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 mt-4 text-md">
                            {isSubmitting ? "Redirecting..." : <><CalendarDays className="mr-2 h-5 w-5" /> Schedule a quick call</>}
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  )
}