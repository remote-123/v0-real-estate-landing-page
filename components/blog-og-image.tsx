import Image from "next/image"

export function BlogOgImage({
  title,
  priority,
  className,
}: {
  title: string
  priority?: boolean
  className?: string
}) {
  const src = `/api/blog-og?title=${encodeURIComponent(title)}`
  return (
    <Image
      src={src}
      alt={title}
      fill
      priority={priority}
      className={className || "object-cover"}
    />
  )
}
