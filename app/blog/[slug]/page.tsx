import Image from "next/image"
import { notFound } from "next/navigation"
import { client } from "@/sanity/lib/client"
import { PortableText } from "next-sanity" // <-- This is the magic rich text renderer!
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Clock, User } from "lucide-react"

export const revalidate = 60

const query = `*[_type == "post" && slug.current == $slug][0]{
  title,
  "slug": slug.current,
  excerpt,
  category,
  date,
  author,
  readTime,
  "image": image.asset->url,
  content
}`

export async function generateStaticParams() {
  const slugs = await client.fetch(`*[_type == "post" && defined(slug.current)]{"slug": slug.current}`)
  return slugs
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await client.fetch(query, { slug })
  if (!post) return { title: "Post Not Found" }
  return {
    title: `${post.title} | NorthCapitalDXB Blog`,
    description: post.excerpt,
    openGraph: { images: [post.image] },
  }
}

// Optional: Custom styling for your rich text so it matches your brand
const ptComponents = {
  types: {
    image: ({ value }: any) => {
      if (!value?.asset?._ref) return null
      // Sanity image builder logic could go here, but for now we'll handle basic images
      return (
        <div className="relative w-full h-96 my-8 rounded-xl overflow-hidden">
          {/* Note: In a full setup, you'd use @sanity/image-url to parse the asset ref to a URL */}
          <div className="bg-muted w-full h-full flex items-center justify-center text-muted-foreground">Image Block</div>
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

  return (
    <>
      <Navbar />
      <main className="bg-background pt-32 pb-20">
        <article className="mx-auto max-w-3xl px-6">
          
          {/* Article Header */}
          <header className="mb-12 text-center">
            <Badge className="mb-6 bg-accent text-accent-foreground">{post.category}</Badge>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl mb-6">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-accent" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <span>{post.readTime}</span>
              </div>
              <time>{post.date}</time>
            </div>
          </header>

          {/* Featured Image */}
          {post.image && (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl mb-12 shadow-lg">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* The Rich Text Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <PortableText value={post.content} components={ptComponents} />
          </div>
          
        </article>
      </main>
      <Footer />
    </>
  )
}