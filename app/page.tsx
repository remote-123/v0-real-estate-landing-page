import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { StrategicAlliances } from "@/components/strategic-alliances"
import { InvestmentStrategy } from "@/components/investment-strategy"
import { TrackRecord } from "@/components/track-record"
import { KnowledgeHub } from "@/components/knowledge-hub"
import { FounderNote } from "@/components/founder-note"
import { TrustSignals } from "@/components/trust-signals"
import { LeadForm } from "@/components/lead-form"
import { Footer } from "@/components/footer"
import { FaqSection } from "@/components/faq-section"
import { FeaturedProjects } from "@/components/featured-projects"

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <StrategicAlliances />
        <FeaturedProjects />
        <InvestmentStrategy />
        <TrackRecord />
        <KnowledgeHub />
        <FounderNote />
        <TrustSignals />
        <FaqSection />
        <LeadForm />
      </main>
      <Footer />
    </>
  )
}
