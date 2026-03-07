"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Phone, MessageCircle } from "lucide-react"
import { SITE_CONFIG } from "@/lib/constants"
import { usePathname } from "next/navigation"

export function MobileStickyBar() {

  
    const pathname = usePathname() // 2. Get the current path

    // 3. Define the routes where this component should be hidden
    const isStudio = pathname?.startsWith("/studio")

    // 4. Return null if we are in the Sanity Studio
    if (isStudio) {
      return null
    }
    return (

      //don't show in sanity /studio page
      <div className="fixed bottom-0 left-0 right-0 z-50 block border-t border-border bg-background p-4 pb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:hidden">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
            asChild
          >
            <Link href={`https://wa.me/${SITE_CONFIG.phone}?text=I'm%20interested%20in%20Dubai%20opportunities`} target="_blank">
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Link>
          </Button>

          <Button
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            asChild
          >
            <Link href="/contact">
              <Phone className="mr-2 h-4 w-4" />
              Book Call
            </Link>
          </Button>
        </div>
      </div>
    )
  }