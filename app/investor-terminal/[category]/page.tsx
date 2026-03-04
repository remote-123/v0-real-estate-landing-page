import { notFound } from "next/navigation"
import { client } from "@/sanity/lib/client"
import { SanityTerminalCategory } from "@/lib/terminal"
import { TerminalCategoryView } from "@/components/investor-terminal/terminal-category-view"

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

export default async function CategoryDrillDownPage({ params }: { params: Promise<{ category: string }> }) {
    const { category: slug } = await params
    const category = await getCategoryData(slug)

    if (!category) {
        notFound()
    }

    return <TerminalCategoryView category={category} />
}
