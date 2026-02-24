import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, Clock } from "lucide-react"
import { client } from "@/sanity/lib/client" // <-- Import Sanity client

export const revalidate = 60 // Refresh data periodically

export const metadata: Metadata = {
  title: "Blog & Insights | NorthCapitalDXB",
  description: "Expert analysis on Dubai real estate trends, investment strategies, and UAE market insights.",
}

// GROQ QUERY: Fetch all posts, ordered by newest date
const query = `*[_type == "post"] | order(date desc) {
  title,
  "slug": slug.current,
  excerpt,
  category,
  date,
  readTime,
  "image": image.asset->url
}`

export default async function BlogPage() {
  // Fetch live from Sanity
  const posts = await client.fetch(query)
  
  if (posts.length === 0) {
    return (
      <div className="pt-40 text-center pb-20 min-h-screen">
        <Navbar />
        <h1 className="text-3xl font-serif">No posts found. Publish one in Sanity Studio!</h1>
      </div>
    )
  }

  // Split the first post as "Featured" and the rest below
  const [featured, ...rest] = posts

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-primary pt-32 pb-20 md:pt-40 md:pb-28">
          <div className="mx-auto max-w-7xl px-6">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Blog & Insights
            </p>
            <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              <span className="text-balance">
                Market trends, investment tips, and UAE guides
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-primary-foreground/70">
              Stay informed with expert analysis from our team of Dubai real estate professionals.
            </p>
          </div>
        </section>

        {/* Featured Post */}
        <section className="bg-background py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <Link href={`/blog/${featured.slug}`} className="group">
              <article className="grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-2">
                <div className="relative aspect-[4/3] overflow-hidden md:aspect-auto">
                  <Image
                    src={featured.image || "/placeholder.svg"}
                    alt={featured.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col justify-center gap-4 p-8 md:p-12">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-accent/10 text-accent">
                      {featured.category}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {featured.readTime}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-card-foreground md:text-3xl">
                    <span className="text-balance">{featured.title}</span>
                  </h2>
                  <p className="leading-relaxed text-muted-foreground">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium text-accent">
                    Read Article
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <p className="text-xs text-muted-foreground">{featured.date}</p>
                </div>
              </article>
            </Link>

            {/* Rest of Posts */}
            {rest.length > 0 && (
              <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((post: any) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex flex-col h-full">
                    <article className="flex flex-1 h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
                      <div className="relative aspect-[16/9] overflow-hidden">
                        <Image
                          src={post.image || "/placeholder.svg"}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-6">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-accent/10 text-accent">
                            {post.category}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {post.readTime}
                          </span>
                        </div>
                        <h3 className="font-serif text-lg font-bold text-card-foreground">
                          <span className="text-balance">{post.title}</span>
                        </h3>
                        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                          {post.excerpt}
                        </p>
                        <p className="text-xs text-muted-foreground">{post.date}</p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}