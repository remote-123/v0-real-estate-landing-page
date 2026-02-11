import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { MapPin, ArrowUpRight } from "lucide-react"

const projects = [
  {
    title: "Marina Skyline Residences",
    location: "Dubai Marina",
    type: "Luxury Apartments",
    startingPrice: "AED 1.8M",
    roi: "8-10% Net Yield",
    image: "/images/project-marina.jpg",
    status: "Selling Now",
  },
  {
    title: "Creek Villas by Emaar",
    location: "Dubai Creek Harbour",
    type: "Waterfront Villas",
    startingPrice: "AED 3.5M",
    roi: "6-8% Net Yield",
    image: "/images/project-creek.jpg",
    status: "Pre-Launch",
  },
  {
    title: "Downtown Panorama Tower",
    location: "Downtown Dubai",
    type: "Premium Penthouses",
    startingPrice: "AED 5.2M",
    roi: "7-9% Net Yield",
    image: "/images/project-downtown.jpg",
    status: "Limited Units",
  },
]

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
          {projects.map((project) => (
            <article
              key={project.title}
              className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
            >
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

              <div className="flex flex-col gap-3 p-6">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {project.location}
                </div>

                <h3 className="flex items-center gap-2 font-serif text-lg font-bold text-card-foreground">
                  {project.title}
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </h3>

                <p className="text-sm text-muted-foreground">{project.type}</p>

                <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Starting From</p>
                    <p className="font-semibold text-card-foreground">
                      {project.startingPrice}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Expected ROI</p>
                    <p className="font-semibold text-accent">{project.roi}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
