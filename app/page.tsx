import type { Metadata } from "next"
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
import { MarketIntelligenceTeaser } from "@/components/market-intelligence-teaser"

export const metadata: Metadata = {
  title: 'Institutional-Grade Dubai Real Estate Advisory | North Capital DXB',
  description: 'Boutique real estate portfolio engineering for global expats. 0% tax, 7%+ net yields, and hard-currency hedging. Vetted inventory and strategic market intelligence.',
  openGraph: {
    title: 'North Capital DXB | Real Estate Investment Strategy',
    description: 'Boutique real estate portfolio engineering for global expats. 7%+ net yields and tax-free capital preservation.',
  }
}

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "North Capital DXB",
  "url": "https://www.northcapitaldxb.com",
  "logo": "https://www.northcapitaldxb.com/images/hero-dubai.jpg",
  "description": "Institutional-grade real estate advisory for global capital in Dubai. Specialized in high-yield, tax-free property portfolios.",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Dubai",
    "addressCountry": "UAE"
  },
  "sameAs": [
    "https://twitter.com/northcapitaldxb",
    "https://www.linkedin.com/company/northcapitaldxb"
  ]
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Can foreigners actually own property in Dubai?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, 100% freehold ownership is possible for international investors in designated areas like Dubai Marina, Downtown, and Palm Jumeirah."
      }
    },
    {
      "@type": "Question",
      "name": "Are there property taxes in Dubai?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. The UAE has zero annual property tax, zero capital gains tax, and zero income tax on rental yields for individual investors."
      }
    },
    {
      "@type": "Question",
      "name": "What is the typical ROI for Dubai real estate?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Institutional-grade assets in Dubai typically offer 7% to 10% net rental yields, significantly higher than most North American or European markets."
      }
    }
  ]
}


export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navbar />
      <main>
        <Hero />
        <StrategicAlliances />
        <FounderNote />
        <MarketIntelligenceTeaser />
        <InvestmentStrategy />
        <FeaturedProjects />
        <TrackRecord />
        <TrustSignals />
        <KnowledgeHub />
        <FaqSection />
        <LeadForm />
      </main>
      <Footer />
    </>
  )
}
