"use client"

import React from 'react'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function WhatsAppButton() {
  // Update with your business number (include country code, no '+')
  const phoneNumber = "971554006230" 
  const message = encodeURIComponent("Hello! I'm interested in learning more about dubai real estate.")
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 group flex items-center"
      aria-label="Chat on WhatsApp"
    >
      {/* Label that appears on hover */}
      <span className="mr-3 px-3 py-1 bg-background/80 backdrop-blur-md text-foreground text-sm font-medium rounded-full shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        Chat with our consultant
      </span>

      <div className="relative">
        {/* Pulsing notification effect */}
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75 animate-ping"></span>
        
        {/* The Main Button - Using WhatsApp brand color */}
        <div className="relative flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-2xl transition-transform duration-300 hover:scale-110 active:scale-95">
          <MessageCircle size={28} fill="currentColor" />
        </div>
      </div>
    </a>
  )
}