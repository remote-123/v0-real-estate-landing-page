import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Play, Clock } from "lucide-react"
import { blogPosts } from "@/lib/blog"

export function KnowledgeHub() {
  return (
    <section className="bg-secondary py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Knowledge Hub
            </p>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              <span className="text-balance">
                Market intelligence for informed investors
              </span>
            </h2>
          </div>
          <Button variant="outline" asChild>
            <Link href="/blog">
              View All Articles
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {blogPosts.map((post) => (
            <article
              key={post.slug}
              className="flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="bg-accent/10 text-accent"
                >
                  {post.category}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {post.readTime}
                </span>
              </div>

              <h3 className="font-serif text-lg font-bold leading-snug text-card-foreground">
                <span className="text-balance">{post.title}</span>
              </h3>

              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                {post.excerpt}
              </p>

              <p className="text-xs text-muted-foreground">{post.date}</p>

              <div className="flex items-center gap-3 border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <Link href={`/blog/${post.slug}`}>Read Analysis</Link>
                </Button>
                <Link
                  href={`/blog/${post.slug}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e53935] text-white transition-opacity hover:opacity-80"
                  aria-label={`Watch breakdown for ${post.title}`}
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
