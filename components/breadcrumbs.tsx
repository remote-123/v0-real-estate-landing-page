"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href: string
  active?: boolean
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  // --- SEO SCHEMA FOR GOOGLE ---
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.northcapitaldxb.com"
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 2,
        "name": item.label,
        "item": `https://www.northcapitaldxb.com${item.href}`
      }))
    ]
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-8 flex items-center">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol className="flex items-center space-x-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <li>
          <Link href="/" className="flex items-center hover:text-accent transition-colors">
            <Home className="h-3 w-3 mr-1" />
            Home
          </Link>
        </li>
        
        {items.map((item, index) => (
          <li key={index} className="flex items-center space-x-2">
            <ChevronRight className="h-3 w-3 opacity-30" />
            {item.active ? (
              <span className="text-foreground font-bold">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-accent transition-colors">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}