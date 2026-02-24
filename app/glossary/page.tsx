import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata = {
  title: "Dubai Real Estate Glossary | NorthCapitalDXB",
  description: "A comprehensive guide translating Dubai real estate jargon into North American terms for international investors.",
}

const terms = [
  { term: "DLD Fee", definition: "The Dubai Land Department fee. It is a one-time 4% tax paid on the purchase of a property.", translation: "Land Transfer Tax / Stamp Duty" },
  { term: "Oqood", definition: "An Arabic word meaning \"Contracts.\" It is the official DLD registration for an off-plan (pre-construction) property before it is built.", translation: null },
  { term: "Title Deed", definition: "The ultimate proof of ownership issued by the DLD once a property is completed and fully paid off.", translation: "Deed / Title" },
  { term: "SPA", definition: "Sale and Purchase Agreement. The legally binding contract between you and the developer.", translation: "The Purchase Agreement" },
  { term: "Ejari", definition: "The DLD’s system to register tenancy contracts. It legally protects both the landlord and the tenant.", translation: "Registered Lease Agreement" },
  { term: "Escrow Account", definition: "Developer funds for off-plan projects are strictly regulated by RERA. Your payments go into a government-monitored escrow account, not the developer's pocket, ensuring funds are only used for construction.", translation: "Trust / Escrow Account" },
  { term: "Golden Visa", definition: "A long-term (10-year) residency visa granted to investors who purchase property worth AED 2,000,000 or more.", translation: "Investor Visa / EB-5 Equivalent" },
]

export default function GlossaryPage() {
  return (
    <>
      <Navbar />
      <main className="bg-secondary/30 pt-32 pb-20 min-h-screen">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <h1 className="font-serif text-4xl font-bold md:text-5xl">Investor Glossary</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Navigating the UAE property market is easier when you speak the language. Here is how local terms translate to North American standards.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {terms.map((item, idx) => (
              <Card key={idx} className="border-border shadow-sm hover:shadow-md transition-shadow bg-card">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="font-serif text-xl text-foreground">{item.term}</CardTitle>
                    {item.translation && (
                      <Badge variant="secondary" className="bg-accent/10 text-accent text-xs text-center shrink-0">
                        NA: {item.translation}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{item.definition}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}