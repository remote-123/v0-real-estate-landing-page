import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Contact Us | Strategic Real Estate Advisory",
    description: "Schedule a private ROI briefing or request off-market inventory from North Capital DXB.",
    alternates: {
        canonical: "https://www.northcapitaldxb.com/contact",
    },
}

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
