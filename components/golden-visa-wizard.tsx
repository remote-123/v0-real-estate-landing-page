"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, AlertCircle, Trophy, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"

export function GoldenVisaWizard() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [budget, setBudget] = useState<string>("")
  const [intent, setIntent] = useState<string>("")
  
  // Lead Info for final step
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const totalSteps = 3

  const handleNext = () => setStep(step + 1)

  // Result Logic
  const getResult = () => {
    if (budget === "high") {
      return {
        title: "Congratulations! You Qualify for the 10-Year Golden Visa.",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        icon: Trophy,
        desc: "An investment of AED 2M+ grants you and your family self-sponsored residency for 10 years."
      }
    }
    if (budget === "medium") {
      return {
        title: "You Qualify for the 2-Year Investor Visa.",
        color: "text-blue-600",
        bg: "bg-blue-50",
        icon: CheckCircle2,
        desc: "An investment of AED 750k+ grants you a renewable 2-year residency permit."
      }
    }
    return {
      title: "Residency Options Are Limited.",
      color: "text-gray-600",
      bg: "bg-gray-50",
      icon: AlertCircle,
      desc: "Investments under AED 750k do not automatically grant residency, but you still own the property 100% tax-free."
    }
  }

  const result = getResult()

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  
  try {
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        budget: budget, // "high", "medium" etc.
        goal: intent,   // "invest" or "live"
        source: "Golden Visa Wizard" // <--- Tags the lead
      }),
       keepalive: true,
    })
    setLoading(false)
    setStep(4) // Move to Success Screen
  } catch (e) {
    setLoading(false)
    alert("Something went wrong.")
  }
}

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
          <Trophy className="mr-2 h-4 w-4" />
          Check Visa Eligibility
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        
        {step < 4 && (
             <DialogHeader>
                <DialogTitle className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                    <span>Eligibility Check</span>
                    <span>Step {step} of {totalSteps}</span>
                </DialogTitle>
                <Progress value={(step / totalSteps) * 100} className="h-2" />
            </DialogHeader>
        )}

        {/* STEP 1: BUDGET */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            <h2 className="text-xl font-bold font-serif">What is your estimated investment budget?</h2>
            <div className="grid gap-3">
              <button onClick={() => { setBudget("low"); handleNext() }} className="p-4 rounded-xl border border-border hover:border-accent hover:bg-accent/5 text-left transition-all">
                <span className="block font-bold">Under AED 750,000</span>
                <span className="text-sm text-muted-foreground">Approx. $205,000 USD</span>
              </button>
              <button onClick={() => { setBudget("medium"); handleNext() }} className="p-4 rounded-xl border border-border hover:border-accent hover:bg-accent/5 text-left transition-all">
                <span className="block font-bold">AED 750,000 - 2 Million</span>
                <span className="text-sm text-muted-foreground">Approx. $205k - $545k USD</span>
              </button>
              <button onClick={() => { setBudget("high"); handleNext() }} className="p-4 rounded-xl border border-border hover:border-accent hover:bg-accent/5 text-left transition-all">
                <span className="block font-bold">Over AED 2 Million</span>
                <span className="text-sm text-muted-foreground">Approx. $545,000+ USD</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: INTENT */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            <h2 className="text-xl font-bold font-serif">What is your primary goal?</h2>
            <div className="grid gap-3">
               <button onClick={() => { setIntent("invest"); handleNext() }} className="p-4 rounded-xl border border-border hover:border-accent hover:bg-accent/5 text-left transition-all">
                <span className="block font-bold">Pure Investment (ROI)</span>
                <span className="text-sm text-muted-foreground">I want rental income & capital growth.</span>
              </button>
              <button onClick={() => { setIntent("live"); handleNext() }} className="p-4 rounded-xl border border-border hover:border-accent hover:bg-accent/5 text-left transition-all">
                <span className="block font-bold">Residency & Lifestyle</span>
                <span className="text-sm text-muted-foreground">I plan to live in Dubai part-time or full-time.</span>
              </button>
            </div>
             <Button variant="ghost" onClick={() => setStep(1)} className="mt-4">Back</Button>
          </div>
        )}

        {/* STEP 3: LEAD CAPTURE (Gated Result) */}
        {step === 3 && (
           <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
                <h2 className="text-xl font-bold font-serif">Analysis Complete</h2>
                <p className="text-muted-foreground">Enter your email to view your official visa eligibility status and download the 2026 Residency Guide.</p>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
                <Input 
                    type="email" 
                    placeholder="name@company.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    Reveal My Results <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </form>
           </div>
        )}

        {/* STEP 4: RESULT */}
        {step === 4 && (
          <div className="space-y-6 py-4 text-center animate-in zoom-in-95">
             <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${result.bg}`}>
                <result.icon className={`h-8 w-8 ${result.color}`} />
             </div>
             <div>
                <h2 className="text-2xl font-bold font-serif">{result.title}</h2>
                <p className="mt-2 text-muted-foreground">{result.desc}</p>
             </div>
             
             <div className="bg-secondary/50 p-4 rounded-lg text-sm text-left space-y-2">
                <p className="font-bold">Next Steps:</p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>We have sent the official visa application guide to <strong>{email}</strong>.</li>
                    <li>Browse our "Golden Visa Compliant" properties below.</li>
                </ul>
             </div>

             <Button className="w-full" onClick={() => setOpen(false)}>
                Browse Properties
             </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}