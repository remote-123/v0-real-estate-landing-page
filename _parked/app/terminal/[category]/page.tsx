import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { client } from "@/sanity/lib/client"
import { SanityTerminalCategory } from "@/lib/terminal"
import { TerminalCategoryView } from "@/components/terminal/terminal-category-view"

export const dynamic = 'force-dynamic'

async function getCategoryData(slug: string): Promise<SanityTerminalCategory | null> {
    return client.fetch(`
        *[_type == "terminalCategory" && slug.current == $slug][0] {
            _id,
            title,
            slug,
            icon,
            order,
            description,
            strategicVerdict,
            metrics
        }
    `, { slug })
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
    const { category: slug } = await params
    const category = await getCategoryData(slug)
    if (!category) return { title: "Category Not Found" }
    return {
        title: `${category.title} Analytics | Dubai Investor Terminal`,
        description: category.description || `Macro-economic real estate metrics for ${category.title} in the Dubai market.`,
        alternates: { canonical: `/terminal/${slug}` }
    }
}

export default async function CategoryDrillDownPage({ params }: { params: Promise<{ category: string }> }) {
    const { category: slug } = await params
    const category = await getCategoryData(slug)

    if (!category) {
        notFound()
    }

    const itemListSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": `${category.title} Market Metrics`,
        "description": category.description,
        "itemListElement": category.metrics?.map((metric, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
                "@type": "PropertyValue",
                "name": metric.label,
                "value": metric.value,
                "description": metric.description
            }
        }))
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
            />
            <TerminalCategoryView category={category} />
        </>
    )
}
