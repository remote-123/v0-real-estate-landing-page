import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { StrategicAlliances } from "@/components/strategic-alliances"
import { ValueProps } from "@/components/value-props"
import { TrackRecord } from "@/components/track-record"
import { KnowledgeHub } from "@/components/knowledge-hub"
import { FounderNote } from "@/components/founder-note"
import { TrustSignals } from "@/components/trust-signals"
import { LeadForm } from "@/components/lead-form"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <StrategicAlliances />
        <ValueProps />
        <TrackRecord />
        <KnowledgeHub />
        <FounderNote />
        <TrustSignals />
        <LeadForm />
      </main>
      <Footer />
    </>
  )
}
