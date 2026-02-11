import Link from "next/link"
import { Mail, Phone, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-primary py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="#" className="font-serif text-xl font-bold text-primary-foreground">
              HorizonCapital
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/60">
              Your trusted gateway to premium UAE real estate investment. Licensed and
              regulated in Dubai.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-primary-foreground/40 uppercase">
              Quick Links
            </h4>
            <ul className="flex flex-col gap-3">
              {["Home", "Projects", "Why Dubai", "Testimonials", "Contact"].map(
                (label) => (
                  <li key={label}>
                    <Link
                      href={`#${label.toLowerCase().replace(" ", "-")}`}
                      className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-primary-foreground/40 uppercase">
              Contact
            </h4>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Mail className="h-4 w-4 shrink-0" />
                info@horizoncapital.ae
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Phone className="h-4 w-4 shrink-0" />
                +971 4 123 4567
              </li>
              <li className="flex items-start gap-2 text-sm text-primary-foreground/70">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                Business Bay, Dubai, UAE
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-primary-foreground/40 uppercase">
              Legal
            </h4>
            <ul className="flex flex-col gap-3">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
                (label) => (
                  <li key={label}>
                    <Link
                      href="#"
                      className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/10 pt-8 md:flex-row">
          <p className="text-sm text-primary-foreground/40">
            &copy; {new Date().getFullYear()} HorizonCapital. All rights reserved.
          </p>
          <p className="text-xs text-primary-foreground/30">
            RERA Registered | DLD Licensed Brokerage
          </p>
        </div>
      </div>
    </footer>
  )
}
