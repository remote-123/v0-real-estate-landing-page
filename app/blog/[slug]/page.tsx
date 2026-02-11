import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Clock, CalendarDays } from "lucide-react"
import { blogPosts, getBlogPostBySlug } from "@/lib/blog"

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)
  if (!post) return { title: "Post Not Found" }

  return {
    title: `${post.title} | HorizonCapital Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      images: [post.image],
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const currentIndex = blogPosts.findIndex((p) => p.slug === slug)
  const relatedPosts = blogPosts.filter((_, i) => i !== currentIndex).slice(0, 2)

  return (
    <>
      <Navbar />
      <main>
        {/* Hero Image */}
        <section className="relative pt-20">
          <div className="relative aspect-[21/9] w-full overflow-hidden">
            <Image
              src={post.image || "/placeholder.svg"}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-foreground/50" />
          </div>
        </section>

        {/* Article */}
        <section className="bg-background py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-6">
            <Link
              href="/blog"
              className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to All Articles
            </Link>

            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="bg-accent/10 text-accent">
                {post.category}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {post.date}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {post.readTime}
              </span>
            </div>

            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              <span className="text-pretty">{post.title}</span>
            </h1>

            <div className="prose-custom mt-10 flex flex-col gap-6">
              {post.content.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-base leading-relaxed text-muted-foreground md:text-lg md:leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-12 rounded-xl border border-border bg-secondary p-8 text-center">
              <h3 className="font-serif text-xl font-bold text-foreground">
                Ready to invest in Dubai?
              </h3>
              <p className="mt-2 text-muted-foreground">
                Book a free consultation and get expert advice tailored to your
                goals.
              </p>
              <Button
                className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90"
                asChild
              >
                <Link href="/contact">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="bg-secondary py-16 md:py-24">
            <div className="mx-auto max-w-7xl px-6">
              <h2 className="mb-8 font-serif text-2xl font-bold text-foreground">
                More from the Blog
              </h2>
              <div className="grid gap-8 md:grid-cols-2">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/blog/${related.slug}`}
                    className="group"
                  >
                    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
                      <div className="relative aspect-[16/9] overflow-hidden">
                        <Image
                          src={related.image || "/placeholder.svg"}
                          alt={related.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-6">
                        <Badge
                          variant="secondary"
                          className="w-fit bg-accent/10 text-accent"
                        >
                          {related.category}
                        </Badge>
                        <h3 className="font-serif text-lg font-bold text-card-foreground">
                          {related.title}
                        </h3>
                        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                          {related.excerpt}
                        </p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
