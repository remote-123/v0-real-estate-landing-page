import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { client } from "@/sanity/lib/client"
import { urlForImage } from "@/sanity/lib/image"
import { PortableText } from "next-sanity"
import { Clock, User, CheckCircle2, HelpCircle, Twitter, Linkedin, MessageCircle, ArrowUpRight, BarChart2, ArrowLeft } from "lucide-react"
import { BlogAdvisorForm } from "@/components/blog-advisor-form"
import { BlogOgImage } from "@/components/blog-og-image"
import { getTerminalSiteInfo } from "@/lib/terminal-metadata"

export const revalidate = 60

const query = `*[_type == "post" && slug.current == $slug][0]{
  title,
  "slug": slug.current,
  excerpt,
  author,
  publishedAt,
  mainImage,
  keyTakeaways,
  faqs,
  body,
  contentType,
  _updatedAt
}`

const relatedQuery = `*[_type == "post" && slug.current != $slug] | order(publishedAt desc) [0..2] {
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  mainImage
}`

export async function generateStaticParams() {
  const slugs = await client.fetch(`*[_type == "post" && defined(slug.current)]{"slug": slug.current}`)
  return slugs
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const [post, { siteName, base }] = await Promise.all([
    client.fetch(query, { slug }),
    getTerminalSiteInfo(),
  ])
  if (!post) return { title: "Post Not Found" }
  const ogImage = post.mainImage
    ? urlForImage(post.mainImage).width(1200).height(630).url()
    : `${base}/api/blog-og?title=${encodeURIComponent(post.title)}`
  return {
    title: `${post.title} | ${siteName}`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "article",
    },
    alternates: { canonical: `${base}/terminal/research/${slug}` },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    },
  }
}

const ptComponents = {
  types: {
    image: ({ value }: any) => {
      if (!value?.asset?._ref) return null
      return (
        <div className="relative w-full h-80 my-8 rounded-xl overflow-hidden border border-border/50">
          <Image src={urlForImage(value).width(800).url()} alt="Article image" fill className="object-cover" />
        </div>
      )
    },
  },
  block: {
    h2: ({ children }: any) => <h2 className="text-2xl font-serif font-bold mt-10 mb-4 text-foreground">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-xl font-serif font-bold mt-6 mb-3 text-foreground">{children}</h3>,
    normal: ({ children }: any) => <p className="leading-relaxed mb-5 text-muted-foreground">{children}</p>,
  },
  list: {
    bullet: ({ children }: any) => <ul className="list-disc pl-5 mb-6 space-y-1.5 text-muted-foreground">{children}</ul>,
    number: ({ children }: any) => <ol className="list-decimal pl-5 mb-6 space-y-1.5 text-muted-foreground">{children}</ol>,
  },
}

export default async function TerminalResearchPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [post, relatedPosts, { base }] = await Promise.all([
    client.fetch(query, { slug }),
    client.fetch(relatedQuery, { slug }),
    getTerminalSiteInfo(),
  ])
  if (!post) notFound()

  const faqSchema = post.faqs?.length > 0 ? {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: post.faqs.map((faq: any) => ({
      "@type": "Question", name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  } : null

  const blogPostingSchema = {
    "@context": "https://schema.org", "@type": "BlogPosting",
    headline: post.title, description: post.excerpt,
    image: post.mainImage ? urlForImage(post.mainImage).width(1200).url() : `${base}/images/hero-dubai.jpg`,
    datePublished: post.publishedAt, dateModified: post._updatedAt || post.publishedAt,
    author: { "@type": "Person", name: post.author || "Investment Strategist" },
    publisher: { "@type": "Organization", name: "North Capital DXB" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${base}/terminal/research/${post.slug}` },
  }

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "Recently Published"

  return (
    <>
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }} />

      <div className="pb-24 lg:pb-10 px-4 sm:px-0 max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/terminal/research" className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Research
          </Link>
        </div>

        {/* Header */}
        <header className="mb-8 max-w-3xl">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4 leading-tight">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono">
            {post.author && (
              <span className="flex items-center gap-1.5">
                <User className="h-3 w-3" /> {post.author}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> {formattedDate}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`${base}/terminal/research/${post.slug}`)}`} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors" title="Share on X">
                <Twitter className="h-3.5 w-3.5" />
              </a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${base}/terminal/research/${post.slug}`)}`} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors" title="Share on LinkedIn">
                <Linkedin className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </header>

        {/* Grid: article + sidebar */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <article className="lg:col-span-8 space-y-6">
            {/* Hero image */}
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border/50">
              {post.mainImage ? (
                <Image src={urlForImage(post.mainImage).width(1200).url()} alt={post.title} fill className="object-cover" priority />
              ) : (
                <BlogOgImage title={post.title} priority />
              )}
            </div>

            {/* Key takeaways */}
            {post.keyTakeaways?.length > 0 && (
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
                <h3 className="font-mono text-xs uppercase tracking-widest text-accent font-semibold mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Key Takeaways
                </h3>
                <ul className="space-y-2">
                  {post.keyTakeaways.map((point: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Body */}
            <div className="prose dark:prose-invert max-w-none">
              {post.body ? <PortableText value={post.body} components={ptComponents} /> : (
                <p className="text-muted-foreground italic">Content coming soon…</p>
              )}
            </div>

            {/* FAQs */}
            {post.faqs?.length > 0 && (
              <div className="border-t border-border/40 pt-8 space-y-4">
                <h2 className="font-serif text-xl font-bold text-foreground">Frequently Asked Questions</h2>
                {post.faqs.map((faq: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-border/50 bg-card/40 p-4">
                    <h3 className="font-semibold text-sm text-foreground flex items-start gap-2 mb-2">
                      <HelpCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" /> {faq.question}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-6">{faq.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Related posts */}
            {relatedPosts?.length > 0 && (
              <div className="border-t border-border/40 pt-8 space-y-4">
                <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">More Insights</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedPosts.map((related: any) => (
                    <Link key={related.slug} href={`/terminal/research/${related.slug}`} className="group flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden hover:border-accent/40 transition-colors">
                      <div className="relative aspect-[16/9] overflow-hidden shrink-0">
                        {related.mainImage ? (
                          <Image src={urlForImage(related.mainImage).width(600).height(338).url()} alt={related.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <BlogOgImage title={related.title} />
                        )}
                      </div>
                      <div className="p-3 flex flex-col gap-1">
                        <h3 className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-accent transition-colors">{related.title}</h3>
                        <span className="text-[10px] text-muted-foreground font-mono mt-auto flex items-center gap-1">
                          Read more <ArrowUpRight className="h-2.5 w-2.5" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col gap-4 lg:col-span-4 sticky top-6">
            <div className="rounded-xl border border-border/50 bg-card/40 p-5">
              <h3 className="font-serif text-base font-bold text-foreground mb-1">Speak to an Advisor</h3>
              <p className="text-xs text-muted-foreground mb-4">Discuss how these market trends impact your portfolio.</p>
              <BlogAdvisorForm postTitle={post.title} />
            </div>

            <Link href="/terminal" className="group rounded-xl border border-border/50 bg-card/40 p-4 hover:border-accent/40 transition-colors flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <BarChart2 className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Live Market Data</p>
                <p className="text-xs text-muted-foreground">DLD transactions, yield maps, deal scanner</p>
                <span className="mt-1.5 flex items-center gap-1 text-xs text-accent font-mono">
                  Explore <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>

            <a href="https://wa.me/971554006230?text=Hi%2C%20I%20read%20your%20article%20and%20have%20a%20question." target="_blank" rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 p-4 hover:bg-[#25D366]/10 transition-colors">
              <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                <MessageCircle className="h-4 w-4 text-white" fill="white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Ask on WhatsApp</p>
                <p className="text-xs text-muted-foreground">Usually within the hour</p>
              </div>
            </a>
          </aside>
        </div>
      </div>
    </>
  )
}
