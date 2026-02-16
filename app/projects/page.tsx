import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, ArrowUpRight, ArrowRight } from "lucide-react"
import { projects } from "@/lib/projects"

export const metadata: Metadata = {
  title: "Masterplans & Projects | NorthCapitalDXB",
  description:
    "Browse our handpicked selection of Dubai real estate developments. From waterfront villas to luxury penthouses, find your perfect investment property.",
  openGraph: {
    title: "Masterplans & Projects | NorthCapitalDXB",
    description:
      "Browse our handpicked selection of Dubai real estate developments.",
    type: "website",
  },
}

export default function ProjectsPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-primary pt-32 pb-20 md:pt-40 md:pb-28">
          <div className="mx-auto max-w-7xl px-6">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Masterplans & Projects
            </p>
            <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              <span className="text-balance">
                Handpicked developments with proven returns
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-primary-foreground/70">
              Every project is vetted by our team for location quality, developer
              track record, and investment upside. Explore the opportunities
              below.
            </p>
          </div>
        </section>

        {/* Projects Grid */}
        <section className="bg-background py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  className="group"
                >
                  <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={project.image || "/placeholder.svg"}
                        alt={`${project.title} in ${project.location}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground">
                        {project.status}
                      </Badge>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-6">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {project.location}
                      </div>

                      <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-card-foreground">
                        {project.title}
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </h2>

                      <p className="text-sm text-muted-foreground">
                        {project.type} by {project.developer}
                      </p>

                      <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Starting From
                          </p>
                          <p className="font-semibold text-card-foreground">
                            {project.startingPrice}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            Expected ROI
                          </p>
                          <p className="font-semibold text-accent">
                            {project.roi}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-secondary py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              <span className="text-balance">
                Don&apos;t see what you&apos;re looking for?
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              We have access to off-market deals and upcoming pre-launches. Tell
              us your criteria and we will curate a shortlist just for you.
            </p>
            <Button
              size="lg"
              className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90"
              asChild
            >
              <Link href="/contact">
                Request a Custom Shortlist
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
