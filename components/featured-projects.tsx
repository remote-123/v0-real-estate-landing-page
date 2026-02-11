import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, ArrowUpRight, ArrowRight } from "lucide-react"
import { projects } from "@/lib/projects"

const featured = projects.slice(0, 3)

export function FeaturedProjects() {
  return (
    <section id="projects" className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Featured Projects
            </p>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              <span className="text-balance">
                Handpicked masterplans with proven returns
              </span>
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground">
            Each project is vetted by our team for location quality, developer
            track record, and investment upside.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {featured.map((project) => (
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

                  <h3 className="flex items-center gap-2 font-serif text-lg font-bold text-card-foreground">
                    {project.title}
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </h3>

                  <p className="text-sm text-muted-foreground">{project.type}</p>

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
                      <p className="font-semibold text-accent">{project.roi}</p>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button
            variant="outline"
            size="lg"
            asChild
          >
            <Link href="/projects">
              View All Projects
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
