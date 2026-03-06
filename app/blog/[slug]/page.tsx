import Image from "next/image"
import { notFound } from "next/navigation"
import { client } from "@/sanity/lib/client"
import { urlForImage } from "@/sanity/lib/image"
import { PortableText } from "next-sanity"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Clock, User, CheckCircle2, HelpCircle, Twitter, Linkedin, MessageCircle } from "lucide-react"
import { LeadForm } from "@/components/lead-form"


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
  _updatedAt
}`

export async function generateStaticParams() {
  const slugs = await client.fetch(`*[_type == "post" && defined(slug.current)]{"slug": slug.current}`)
  return slugs
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await client.fetch(query, { slug })

  if (!post) return { title: "Post Not Found" }

  const ogImage = post.mainImage
    ? urlForImage(post.mainImage).width(1200).height(630).url()
    : "/images/hero-dubai.jpg"

  return {
    title: `${post.title} | NorthCapitalDXB Insights`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: 'article',
    },
    alternates: {
      canonical: `https://www.northcapitaldxb.com/blog/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    }
  }
}

const ptComponents = {
  types: {
    image: ({ value }: any) => {
      if (!value?.asset?._ref) return null
      return (
        <div className="relative w-full h-96 my-8 rounded-xl overflow-hidden shadow-lg border border-border">
          <Image
            src={urlForImage(value).width(800).url()}
            alt="Blog inline image"
            fill
            className="object-cover"
          />
        </div>
      )
    }
  },
  block: {
    h2: ({ children }: any) => <h2 className="text-3xl font-serif font-bold mt-12 mb-6 text-foreground">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-2xl font-serif font-bold mt-8 mb-4 text-foreground">{children}</h3>,
    normal: ({ children }: any) => <p className="text-lg leading-relaxed mb-6 text-muted-foreground">{children}</p>,
  },
  list: {
    bullet: ({ children }: any) => <ul className="list-disc pl-6 mb-8 space-y-2 text-lg text-muted-foreground">{children}</ul>,
    number: ({ children }: any) => <ol className="list-decimal pl-6 mb-8 space-y-2 text-lg text-muted-foreground">{children}</ol>,
  },
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await client.fetch(query, { slug })

  if (!post) notFound()

  const faqSchema = post.faqs && post.faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": post.faqs.map((faq: any) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  } : null;

  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt,
    "image": post.mainImage ? urlForImage(post.mainImage).width(1200).url() : "https://www.northcapitaldxb.com/images/hero-dubai.jpg",
    "datePublished": post.publishedAt,
    "dateModified": post._updatedAt || post.publishedAt,
    "author": {
      "@type": "Person",
      "name": post.author || "Investment Strategist",
      "jobTitle": "MD at North Capital DXB"
    },
    "publisher": {
      "@type": "Organization",
      "name": "North Capital DXB",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.northcapitaldxb.com/images/hero-dubai.jpg"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://www.northcapitaldxb.com/blog/${post.slug}`
    }
  };

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Recently Published'

  return (
    <>
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />

      <Navbar />
      <main className="bg-background pt-32">
        {/* 2. INCREASED MAX-WIDTH TO ALLOW ROOM FOR SIDEBAR */}
        <div className="mx-auto max-w-7xl px-6 pb-20">

          {/* Header remains centered at the top */}
          <header className="mb-12 mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl mb-6 text-balance">
              {post.title}
            </h1>

            <div className="flex flex-col items-center gap-6 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-accent" />
                  <span className="font-medium">{post.author}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 text-accent" />
                  <time>{formattedDate}</time>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://www.northcapitaldxb.com/blog/${post.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Share on X"
                  className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full transition-all hover:bg-accent/10 hover:text-accent group border border-transparent hover:border-accent/20"
                >
                  <Twitter className="h-3.5 w-3.5 text-accent group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">X</span>
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://www.northcapitaldxb.com/blog/${post.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Share on LinkedIn"
                  className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full transition-all hover:bg-accent/10 hover:text-accent group border border-transparent hover:border-accent/20"
                >
                  <Linkedin className="h-3.5 w-3.5 text-accent group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">LinkedIn</span>
                </a>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${post.title} https://www.northcapitaldxb.com/blog/${post.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Share on WhatsApp"
                  className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full transition-all hover:bg-accent/10 hover:text-accent group border border-transparent hover:border-accent/20"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-accent group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">WhatsApp</span>
                </a>
              </div>
            </div>
          </header>

          {/* 3. THE GRID LAYOUT: 8 Columns for Content, 4 Columns for Sidebar */}
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">

            {/* LEFT SIDE: Main Article Content */}
            <article className="lg:col-span-8">
              {post.mainImage && (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl mb-12 shadow-xl border border-border">
                  <Image
                    src={urlForImage(post.mainImage).width(1200).url()}
                    alt={post.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}

              {post.keyTakeaways && post.keyTakeaways.length > 0 && (
                <div className="mb-12 rounded-xl border border-accent/20 bg-accent/5 p-6 md:p-8 shadow-sm">
                  <h3 className="font-serif text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    Key Takeaways
                  </h3>
                  <ul className="space-y-3">
                    {post.keyTakeaways.map((point: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                        <span className="text-lg leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="prose prose-lg dark:prose-invert max-w-none">
                {post.body ? (
                  <PortableText value={post.body} components={ptComponents} />
                ) : (
                  <p className="text-muted-foreground italic">Content coming soon...</p>
                )}
              </div>

              {post.faqs && post.faqs.length > 0 && (
                <div className="mt-16 border-t border-border pt-12">
                  <h2 className="font-serif text-3xl font-bold text-foreground mb-8">Frequently Asked Questions</h2>
                  <div className="space-y-6">
                    {post.faqs.map((faq: any, idx: number) => (
                      <div key={idx} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <h3 className="font-bold text-lg text-foreground flex items-start gap-3 mb-3">
                          <HelpCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                          {faq.question}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed pl-8">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* RIGHT SIDE: The Sticky Sidebar (Hidden on Mobile) */}
            <aside className="hidden lg:flex flex-col gap-6 lg:col-span-4 sticky top-32">

              {/* Tool 1: Quick Contact Box */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-xl border-t-4 border-t-accent">
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">Speak to an Advisor</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Discuss how these market trends impact your investment portfolio.
                </p>

                {/* The Lead Form */}
                <LeadForm minimal={true} projectName={`Blog Sidebar: ${post.title}`} />
              </div>

            </aside>

          </div>
        </div>

      </main>
      <Footer />
    </>
  )
}