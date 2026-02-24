import React from "react"
import Image from "next/image"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, ArrowUpRight, ArrowRight, Calendar, Filter } from "lucide-react"
import { client } from "@/sanity/lib/client" // <-- NEW: Import the Sanity client
import { cn } from "@/lib/utils"
import { urlForImage } from "@/sanity/lib/image" // <-- NEW: Import the image URL builder
// Tell Next.js to re-fetch the data from Sanity periodically so it's never stale
export const revalidate = 60 

const ALL_CATEGORY = "All Projects"

// --- THE GROQ QUERY ---
const query = `*[_type == "project"]{
  "slug": slug.current,
  title,
  location,
  developer,
  category,
  startingPrice,
  roi,
  status,
  completion,
  image
}`

export default async function ProjectsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ category?: string }> 
}) {
  // Await search params in Next.js 15
  const params = await searchParams
  const activeCategory = params.category || ALL_CATEGORY

  // Fetch all projects from Sanity
  const projects = await client.fetch(query)

  // Extract unique categories dynamically from the live data
  const categories = [
    ALL_CATEGORY, 
    ...Array.from(new Set(projects.map((p: any) => p.category).filter(Boolean)))
  ] as string[]

  // Filter logic based on the URL parameter
  const filteredProjects = projects.filter((project: any) => {
    if (activeCategory === ALL_CATEGORY) return true
    return project.category === activeCategory
  })

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-primary pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="mx-auto max-w-7xl px-6">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Investment Gallery
            </p>
            <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              <span className="text-balance">
                Curated Off-Plan & <br/> Pre-Launch Opportunities
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-primary-foreground/70">
              Access the developer's full masterplan data. Filter by property type to find your next high-yield asset.
            </p>
          </div>
        </section>

        {/* Filter Bar & Grid */}
        <section className="bg-background py-12 md:py-20">
          <div className="mx-auto max-w-7xl px-6">
            
            {/* Category Filter using URL params */}
            <div className="mb-10 flex flex-wrap items-center gap-2 border-b border-border pb-6">
              <div className="mr-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filter:
              </div>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={cat === ALL_CATEGORY ? "/projects" : `/projects?category=${cat}`}
                  scroll={false} // Prevents the page from aggressively scrolling to top when clicked
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
                    activeCategory === cat
                      ? "bg-foreground text-background shadow-md"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  )}
                >
                  {cat}
                </Link>
              ))}
            </div>

            {/* Projects Grid */}
            {filteredProjects.length > 0 ? (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project: any) => (
                  <Link
                    key={project.slug}
                    href={`/projects/${project.slug}`}
                    className="group flex flex-col h-full"
                  >
                    <article className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                      
                      {/* Image Container */}
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                       <Image
                          // Tell Sanity to compress this image and make it a max width of 800px!
                          src={project.image ? urlForImage(project.image).width(800).url() : "/placeholder.svg"}
                          alt={`${project.title} in ${project.location}`}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        
                        {/* Dynamic Status Badge */}
                        <div className="absolute left-4 top-4 flex gap-2">
                           <Badge className={cn(
                            "border-none shadow-sm uppercase tracking-wider text-[10px] font-bold px-3 py-1",
                            (project.status === "Upcoming" || project.status === "Pre-Launch")
                              ? "bg-accent text-accent-foreground"
                              : "bg-primary text-primary-foreground"
                          )}>
                            {project.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-6">
                        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-accent" />
                            {project.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {project.completion || "Coming Soon"}
                          </div>
                        </div>

                        <h2 className="mb-1 font-serif text-xl font-bold text-card-foreground group-hover:text-accent transition-colors">
                          {project.title}
                        </h2>
                        <p className="text-sm font-medium text-muted-foreground mb-4">
                          by {project.developer}
                        </p>

                        <div className="mt-auto border-t border-border/50 pt-4">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Starting Price</p>
                              <p className="text-lg font-bold text-foreground">{project.startingPrice}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Est. ROI</p>
                              <div className="flex items-center gap-1 text-accent font-bold">
                                {project.roi}
                                <ArrowUpRight className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            ) : (
              // Empty State
              <div className="py-20 text-center">
                <p className="text-lg text-muted-foreground">No projects found in this category.</p>
                <Button 
                  variant="link" 
                  className="mt-2 text-accent"
                  asChild
                >
                  <Link href="/projects">Clear Filters</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* CTA: Shortlist */}
        <section className="bg-secondary py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Looking for something specific?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground leading-relaxed">
              We have access to <strong>off-market bulk deals</strong> and <strong>pre-launch inventories</strong> that aren't listed publicly.
            </p>
            <Button
              size="lg"
              className="mt-8 bg-foreground text-background hover:bg-foreground/90"
              asChild
            >
              <Link href="/contact">
                Request Private Inventory
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