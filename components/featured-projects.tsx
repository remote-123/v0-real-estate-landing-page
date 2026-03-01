import Image from "next/image"
import Link from "next/link"
import { ArrowRight, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { client } from "@/sanity/lib/client"
import { urlForImage } from "@/sanity/lib/image"

// GROQ Query to get the 3 newest projects
const query = `*[_type == "project" && defined(slug.current)] | order(_createdAt desc)[0...3] {
  title,
  "slug": slug.current,
  location,
  startingPrice,
  status,
  category,
  image
}`

export async function FeaturedProjects() {
  const projects = await client.fetch(query)

  if (!projects || projects.length === 0) return null

  return (
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        
        <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Exclusive Inventory
            </p>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Featured Investment Opportunities
            </h2>
          </div>
          <Link
            href="/projects"
            className="group flex shrink-0 items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent/80"
          >
            View all projects
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => (
            <Link key={project.slug} href={`/projects/${project.slug}`} className="group flex flex-col h-full">
              <article className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                
                {/* Image & Badges */}
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={project.image ? urlForImage(project.image).width(800).url() : "/placeholder.svg"}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                  
                  <div className="absolute top-4 left-4 flex gap-2">
                    {project.status && (
                      <Badge className="bg-accent text-accent-foreground border-none font-semibold shadow-md">
                        {project.status}
                      </Badge>
                    )}
                    {project.category && (
                      <Badge variant="secondary" className="bg-white/90 text-black border-none font-semibold shadow-md">
                        {project.category}
                      </Badge>
                    )}
                  </div>

                  {/* Price overlay at the bottom of the image */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-xs font-medium text-white/80 uppercase tracking-wider mb-1">Starting From</p>
                    <p className="text-2xl font-bold text-white">{project.startingPrice || "Price on Request"}</p>
                  </div>
                </div>

                {/* Content Box */}
                <div className="flex flex-col gap-3 p-6">
                  <h3 className="font-serif text-xl font-bold text-card-foreground line-clamp-1">
                    {project.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-accent shrink-0" />
                    <span className="text-sm line-clamp-1">{project.location || "Dubai, UAE"}</span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                      View Investment Thesis
                    </span>
                    <ArrowRight className="h-4 w-4 text-accent transition-transform group-hover:translate-x-1" />
                  </div>
                </div>

              </article>
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}