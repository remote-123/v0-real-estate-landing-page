import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-dubai.jpg"
          alt="Panoramic view of the Dubai skyline at golden hour"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-foreground/60" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start gap-8 px-6 pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-xs font-medium tracking-wide text-primary-foreground/90 uppercase">
            building wealth is for everyone
          </span>
        </div>

        <h1 className="max-w-4xl font-serif text-4xl leading-tight font-bold tracking-tight text-primary-foreground md:text-6xl lg:text-7xl">
          <span className="text-balance">
            Doorway to Dubai <br />
            <span className="text-accent">Real Estate</span> <br/>
            For North Americans
          </span>
        </h1>

        <p className="max-w-2xl text-lg leading-relaxed text-primary-foreground/80 md:text-xl">
          RERA-licensed expertise and partnership with Dubai&apos;s leading brokerage, we help you bypass the tourist traps to access vetted, high-appreciation assets—complete with a strategic exit plan and no additional cost to you.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            asChild
          >
            <Link href="/contact">
              Start Your Portfolio
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            asChild
          >
            <Link href="/projects">Explore Projects</Link>
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-8 border-t border-primary-foreground/20 pt-8 md:gap-12">
          <div>
            <p className="font-serif text-3xl font-bold text-primary-foreground md:text-4xl">
              $2.8B+
            </p>
            <p className="text-sm text-primary-foreground/60">Assets Guided</p>
          </div>
          <div>
            <p className="font-serif text-3xl font-bold text-primary-foreground md:text-4xl">
              500+
            </p>
            <p className="text-sm text-primary-foreground/60">
              High-Net-Worth Partners
            </p>
          </div>
          <div>
            <p className="font-serif text-3xl font-bold text-primary-foreground md:text-4xl">
              0%
            </p>
            <p className="text-sm text-primary-foreground/60">
              Tax Efficiency
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}