import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { ValueProps } from "@/components/value-props"
import { FeaturedProjects } from "@/components/featured-projects"
import { TrustSignals } from "@/components/trust-signals"
import { LeadForm } from "@/components/lead-form"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ValueProps />
        <FeaturedProjects />
        <TrustSignals />
        <LeadForm />
      </main>
      <Footer />
    </>
  )
}
