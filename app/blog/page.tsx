import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, Calendar } from "lucide-react"
import { client } from "@/sanity/lib/client"
import { urlForImage } from "@/sanity/lib/image"
import { BlogOgImage } from "@/components/blog-og-image"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Blog & Insights | NorthCapitalDXB",
  description: "Expert analysis on Dubai real estate trends, investment strategies, and UAE market insights.",
  alternates: {
    canonical: 'https://www.northcapitaldxb.com/blog',
  },
}

const query = `*[_type == "post"] | order(publishedAt desc) {
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  mainImage,
  _updatedAt
}`

function formatDate(dateString: string) {
  if (!dateString) return "Recently"
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export default async function BlogPage() {
  const posts = await client.fetch(query)

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "North Capital DXB Blog & Insights",
    "description": "Expert analysis on Dubai real estate trends, investment strategies, and UAE market insights.",
    "itemListElement": posts.map((post: any, index: number) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "BlogPosting",
        "headline": post.title,
        "url": `https://www.northcapitaldxb.com/blog/${post.slug}`,
        "datePublished": post.publishedAt,
        "image": post.mainImage ? urlForImage(post.mainImage).width(800).url() : "https://www.northcapitaldxb.com/images/hero-dubai.jpg"
      }
    }))
  };

  if (posts.length === 0) {
    return (
      <div className="pt-40 text-center pb-20 min-h-screen">
        <Navbar />
        <h1 className="text-3xl font-serif">No posts found. Publish one in Sanity Studio!</h1>
      </div>
    )
  }

  const [featured, ...rest] = posts

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <Navbar />
      <main>
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

        <section className="bg-background py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6">

            <Link href={`/blog/${featured.slug}`} className="group">
              <article className="grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-2 shadow-sm transition-shadow hover:shadow-md">
                <div className="relative aspect-[4/3] overflow-hidden md:aspect-auto">
                  {featured.mainImage ? (
                    <Image
                      src={urlForImage(featured.mainImage).width(800).url()}
                      alt={featured.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      priority
                    />
                  ) : (
                    <BlogOgImage title={featured.title} priority />
                  )}
                </div>
                <div className="flex flex-col justify-center gap-4 p-8 md:p-12">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-accent/10 text-accent">
                      Market Insight
                    </Badge>
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-card-foreground md:text-3xl">
                    <span className="text-balance">{featured.title}</span>
                  </h2>
                  <p className="leading-relaxed text-muted-foreground line-clamp-3">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-accent">
                      Read Article
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                      <Calendar className="h-3 w-3" />
                      {formatDate(featured.publishedAt)}
                    </span>
                  </div>
                </div>
              </article>
            </Link>

            {rest.length > 0 && (
              <div className="mt-10 flex flex-col divide-y divide-border border border-border rounded-xl overflow-hidden">
                {rest.map((post: any) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                    <article className="flex items-center gap-4 bg-card px-5 py-4 transition-colors hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif text-sm font-bold text-card-foreground line-clamp-1 group-hover:text-accent transition-colors">
                          {post.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {post.excerpt}
                        </p>
                      </div>
                      <span className="flex-shrink-0 flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.publishedAt)}
                      </span>
                      <ArrowUpRight className="flex-shrink-0 h-4 w-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
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