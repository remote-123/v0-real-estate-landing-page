import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Building2,
} from "lucide-react"
import { projects, getProjectBySlug } from "@/lib/projects"

export async function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const project = getProjectBySlug(slug)
  if (!project) return { title: "Project Not Found" }

  return {
    title: `${project.title} | HorizonCapital`,
    description: project.description.slice(0, 160),
    openGraph: {
      title: `${project.title} | HorizonCapital`,
      description: project.description.slice(0, 160),
      type: "website",
      images: [project.image],
    },
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = getProjectBySlug(slug)

  if (!project) {
    notFound()
  }

  return (
    <>
      <Navbar />
      <main>
        {/* Hero Image */}
        <section className="relative pt-20">
          <div className="relative aspect-[21/9] w-full overflow-hidden">
            <Image
              src={project.image || "/placeholder.svg"}
              alt={project.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-foreground/40" />
            <div className="absolute inset-0 flex items-end">
              <div className="mx-auto w-full max-w-7xl px-6 pb-10">
                <Badge className="mb-4 bg-accent text-accent-foreground">
                  {project.status}
                </Badge>
                <h1 className="font-serif text-3xl font-bold text-primary-foreground md:text-5xl">
                  {project.title}
                </h1>
                <div className="mt-2 flex items-center gap-2 text-primary-foreground/80">
                  <MapPin className="h-4 w-4" />
                  <span>{project.location}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="bg-background py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-8">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to All Projects
              </Link>
            </div>

            <div className="grid gap-12 lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
                  About this Development
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  {project.description}
                </p>

                <div className="mt-10">
                  <h3 className="font-serif text-xl font-bold text-foreground">
                    Investment Highlights
                  </h3>
                  <ul className="mt-4 flex flex-col gap-3">
                    {project.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                        <span className="text-foreground">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Sidebar */}
              <div>
                <div className="sticky top-28 rounded-xl border border-border bg-card p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-accent" />
                    <span className="text-sm text-muted-foreground">
                      by {project.developer}
                    </span>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs text-muted-foreground uppercase">
                      Starting From
                    </p>
                    <p className="font-serif text-2xl font-bold text-card-foreground">
                      {project.startingPrice}
                    </p>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs text-muted-foreground uppercase">
                      Expected Net Yield
                    </p>
                    <p className="font-serif text-2xl font-bold text-accent">
                      {project.roi}
                    </p>
                  </div>

                  <div className="mb-6 grid grid-cols-2 gap-4 border-t border-border pt-6">
                    {project.details.map((d) => (
                      <div key={d.label}>
                        <p className="text-xs text-muted-foreground">
                          {d.label}
                        </p>
                        <p className="text-sm font-medium text-card-foreground">
                          {d.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    size="lg"
                    asChild
                  >
                    <Link href="/contact">
                      Enquire About This Project
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Free consultation, no obligations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
