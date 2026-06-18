import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Dubai Real Estate Affordability Calculator",
    description: "Calculate your purchasing power in the Dubai market. See which off-plan or ready properties fit your target ROI and cash flow goals.",
    alternates: {
        canonical: "https://www.northcapitaldxb.com/calculator",
    },
}

export default function CalculatorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
