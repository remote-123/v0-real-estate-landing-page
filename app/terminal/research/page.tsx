import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, Calendar } from "lucide-react"
import { client } from "@/sanity/lib/client"
import { urlForImage } from "@/sanity/lib/image"
import { BlogOgImage } from "@/components/blog-og-image"
import { getTerminalSiteInfo } from "@/lib/terminal-metadata"

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, base } = await getTerminalSiteInfo()
  return {
    title: `Research & Insights | ${siteName}`,
    description: "Expert analysis on Dubai real estate trends, investment strategies, and UAE market insights.",
    alternates: { canonical: `${base}/terminal/research` },
  }
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
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function TerminalResearchPage() {
  const posts = await client.fetch(query)

  if (posts.length === 0) {
    return (
      <div className="flex flex-col gap-6 px-4 sm:px-0 max-w-4xl mx-auto">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Research</p>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Insights</h1>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/40 p-8 text-center text-muted-foreground font-mono text-sm">
          No articles published yet.
        </div>
      </div>
    )
  }

  const [featured, ...rest] = posts

  return (
    <div className="flex flex-col gap-6 pb-24 lg:pb-10 px-4 sm:px-0 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Research</p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Insights</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Expert analysis on Dubai real estate trends, investment strategy, and UAE market data.
        </p>
      </div>

      {/* Featured */}
      <Link href={`/terminal/research/${featured.slug}`} className="group">
        <article className="grid overflow-hidden rounded-xl border border-border/50 bg-card md:grid-cols-2 transition-colors hover:border-accent/40">
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
          <div className="flex flex-col justify-center gap-4 p-6 md:p-8">
            <Badge variant="secondary" className="w-fit bg-accent/10 text-accent border-none font-mono text-[10px] uppercase tracking-widest">
              Market Insight
            </Badge>
            <h2 className="font-serif text-xl font-bold text-foreground leading-snug">
              {featured.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {featured.excerpt}
            </p>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1 text-xs font-medium text-accent font-mono">
                Read <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto font-mono">
                <Calendar className="h-3 w-3" />
                {formatDate(featured.publishedAt)}
              </span>
            </div>
          </div>
        </article>
      </Link>

      {/* Rest */}
      {rest.length > 0 && (
        <div className="flex flex-col divide-y divide-border/30 border border-border/50 rounded-xl overflow-hidden">
          {rest.map((post: any) => (
            <Link key={post.slug} href={`/terminal/research/${post.slug}`} className="group">
              <article className="flex items-center gap-4 bg-card px-5 py-4 transition-colors hover:bg-muted/30">
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-sm font-bold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
                    {post.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{post.excerpt}</p>
                </div>
                <span className="flex-shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                  <Calendar className="h-3 w-3" />
                  {formatDate(post.publishedAt)}
                </span>
                <ArrowUpRight className="flex-shrink-0 h-3.5 w-3.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
