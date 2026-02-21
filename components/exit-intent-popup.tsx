"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, X } from "lucide-react"

export function ExitIntentPopup() {
  const [open, setOpen] = useState(false)
  const [hasShown, setHasShown] = useState(false)
    const [email, setEmail] = useState("")
const [loading, setLoading] = useState(false)

const handleSubmit = async () => {
  setLoading(true)
  try {
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        source: "Exit Intent Popup", // <--- Tags the lead
        goal: "Requested Market Report"
      }),
       keepalive: true,
    })
    setOpen(false) // Close popup on success
    alert("Report sent to your inbox!")
  } catch (e) {
    alert("Error sending report.")
  } finally {
    setLoading(false)
  }
}
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShown) {
        setOpen(true)
        setHasShown(true)
      }
    }

    document.addEventListener("mouseleave", handleMouseLeave)
    return () => document.removeEventListener("mouseleave", handleMouseLeave)
  }, [hasShown])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-bold">Wait! Don't leave empty-handed.</DialogTitle>
          <DialogDescription>
            Download our <span className="font-bold text-foreground">2026 Dubai Market Outlook</span>. 
            See which 3 areas are projected to appreciate by 15% this year.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-4 py-4">
           <div className="hidden w-1/3 sm:block relative bg-gray-100 rounded-lg overflow-hidden">
               {/* Ideally a picture of the PDF cover here */}
               <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">PDF Cover</div>
           </div>
           <div className="flex-1 space-y-4">
               <Input placeholder="Enter your email" 
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               />
               <Button 
               onClick={handleSubmit}
               disabled={loading}
               className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <Download className="mr-2 h-4 w-4" />
                  {loading ? "Sending..." : "Send Me The Report"}
               </Button>
               <p className="text-[10px] text-muted-foreground text-center">No spam. Unsubscribe anytime.</p>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}