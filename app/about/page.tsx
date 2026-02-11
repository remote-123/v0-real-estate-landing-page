import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Shield,
  TrendingUp,
  Globe,
  Building2,
  Landmark,
  BadgeCheck,
  Users,
} from "lucide-react"

export const metadata: Metadata = {
  title: "About HorizonCapital | Why Invest in UAE Real Estate",
  description:
    "Learn about HorizonCapital, your trusted Dubai investment advisory partner. Discover why the UAE is the world's most attractive destination for real estate investors.",
  openGraph: {
    title: "About HorizonCapital | Why Invest in UAE Real Estate",
    description:
      "Learn about HorizonCapital, your trusted Dubai investment advisory partner.",
    type: "website",
  },
}

const whyDubaiReasons = [
  {
    icon: Shield,
    title: "Zero Income Tax",
    description:
      "The UAE imposes no personal income tax, no capital gains tax, and no property tax. Investors retain 100% of their rental income and appreciation profits.",
  },
  {
    icon: TrendingUp,
    title: "Record-Breaking Growth",
    description:
      "Dubai recorded over AED 522 billion in real estate transactions in 2024, a 36% year-on-year increase. The market continues to outpace global benchmarks.",
  },
  {
    icon: Globe,
    title: "Global Connectivity",
    description:
      "Dubai is within an 8-hour flight of two-thirds of the world's population. Its world-class infrastructure attracts talent and capital from every continent.",
  },
  {
    icon: Building2,
    title: "Visionary Development",
    description:
      "From the Dubai 2040 Urban Master Plan to EXPO City and Dubai South, the emirate continuously invests in megaprojects that drive long-term property values.",
  },
  {
    icon: Landmark,
    title: "Investor-Friendly Regulations",
    description:
      "100% foreign ownership in freehold zones, golden visas for property investors, and a transparent regulatory framework governed by DLD and RERA.",
  },
  {
    icon: Users,
    title: "Population Boom",
    description:
      "Dubai's population is projected to reach 5.8 million by 2040, up from 3.7 million today. Strong demand for housing fuels consistent rental yields of 6-10%.",
  },
]

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative flex items-end overflow-hidden bg-primary pt-32 pb-20 md:pt-40 md:pb-28">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6">
            <p className="text-sm font-semibold tracking-wide text-accent uppercase">
              About Us
            </p>
            <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              <span className="text-balance">
                Guiding global investors into Dubai&apos;s extraordinary real
                estate market
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-primary-foreground/70">
              HorizonCapital is a premier investment advisory firm partnered with
              a fully licensed Dubai brokerage, bridging international investors
              with the UAE&apos;s most promising property opportunities.
            </p>
          </div>
        </section>

        {/* Our Story */}
        <section className="bg-background py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
                  Our Story
                </p>
                <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  <span className="text-balance">
                    Built on trust, powered by expertise
                  </span>
                </h2>
                <div className="mt-6 flex flex-col gap-4 text-muted-foreground leading-relaxed">
                  <p>
                    HorizonCapital was founded with a clear mission: to make UAE
                    real estate investment accessible, transparent, and
                    profitable for international investors. Based in Dubai and
                    partnered with a RERA-licensed brokerage, we combine deep
                    local market knowledge with a global investor mindset.
                  </p>
                  <p>
                    Our team of seasoned advisors has collectively guided over
                    $2.8 billion in property transactions, serving clients from
                    30+ countries. We don&apos;t just sell properties -- we build
                    long-term investment strategies tailored to each
                    client&apos;s goals.
                  </p>
                  <p>
                    Whether you&apos;re a first-time buyer exploring off-plan
                    opportunities or a seasoned investor diversifying your
                    portfolio, HorizonCapital provides the end-to-end guidance
                    you need to succeed in the UAE.
                  </p>
                </div>
              </div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <Image
                  src="/images/about-team.jpg"
                  alt="The HorizonCapital advisory team in our Dubai office"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Why Dubai */}
        <section className="bg-secondary py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 max-w-2xl">
              <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
                Why Dubai
              </p>
              <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                <span className="text-balance">
                  Why North American and global investors choose Dubai
                </span>
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Dubai combines the tax advantages of an offshore haven with the
                infrastructure and stability of a world-class city. Here&apos;s
                what makes it irresistible.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {whyDubaiReasons.map((reason) => (
                <div
                  key={reason.title}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-card p-8 transition-shadow hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                    <reason.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-card-foreground">
                    {reason.title}
                  </h3>
                  <p className="leading-relaxed text-muted-foreground">
                    {reason.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Brokerage Partnership */}
        <section className="bg-background py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="rounded-xl border border-border bg-card p-10 md:p-16">
              <div className="grid items-center gap-12 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
                    Our Partnership
                  </p>
                  <h2 className="font-serif text-3xl font-bold tracking-tight text-card-foreground md:text-4xl">
                    <span className="text-balance">
                      Licensed Dubai brokerage partnership
                    </span>
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                    HorizonCapital operates through a strategic partnership with
                    a fully licensed and DLD-registered Dubai brokerage. This
                    ensures every transaction is legally compliant, fully
                    transparent, and protected by the UAE&apos;s robust
                    regulatory framework.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-8">
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-border p-6 text-center">
                    <BadgeCheck className="h-10 w-10 text-accent" />
                    <p className="font-serif text-lg font-bold text-card-foreground">
                      RERA Licensed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Real Estate Regulatory Agency
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-border p-6 text-center">
                    <Landmark className="h-10 w-10 text-accent" />
                    <p className="font-serif text-lg font-bold text-card-foreground">
                      DLD Registered
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dubai Land Department
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-accent py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-accent-foreground md:text-4xl">
              <span className="text-balance">
                Ready to explore Dubai real estate?
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-accent-foreground/80">
              Book a free, no-obligation consultation with one of our UAE
              property experts and discover the right investment for your goals.
            </p>
            <Button
              size="lg"
              className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <Link href="/contact">
                Book a Free Consultation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
