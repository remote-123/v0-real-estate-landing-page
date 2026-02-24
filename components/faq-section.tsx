import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function FaqSection() {
  const faqs = [
    {
      question: "Can foreigners actually own property in Dubai?",
      answer: "Yes, 100% freehold. In designated \"Freehold Areas\" (which include all major investment hubs like Dubai Marina, Downtown, and Palm Jumeirah), international investors have full ownership rights to the property and the land it sits on, which can be sold, leased, or inherited."
    },
    {
      question: "Do I need to be in Dubai to buy property?",
      answer: "No. Our team facilitates the entire transaction remotely. From virtual walkthroughs to handling the SPA (Sale and Purchase Agreement) and securely transferring funds to government-regulated escrow accounts, the entire process can be done from North America."
    },
    {
      question: "Are there really zero property taxes?",
      answer: "Yes. The UAE has no annual property tax, no capital gains tax, and no income tax on rental yields. Your net ROI is substantially higher than comparable markets in North America. (Disclaimer: You should still consult your local CPA regarding foreign asset reporting in the US/Canada)."
    },
    {
      question: "Who manages my property and finds tenants?",
      answer: "We do. As an end-to-end advisory, we handle property handover, snagging (inspections), interior furnishing, tenant sourcing, and Ejari (lease) registration so your investment is entirely hands-off."
    }
  ]

  return (
    <section className="py-20 bg-background border-t border-border">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">Frequently Asked Questions</h2>
          <p className="mt-4 text-lg text-muted-foreground">Clarity for International Investors</p>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-lg font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}