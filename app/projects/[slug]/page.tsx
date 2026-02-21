import React from "react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getProjectBySlug, projects } from "@/lib/projects"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
// Added 'Car' and 'FileText' icons
import { CheckCircle2, MapPin, Download, Phone, Car, FileText, Lock } from "lucide-react"
import { LeadForm } from "@/components/lead-form"
import { ROICalculator } from "@/components/roi-calculator"



// Generate SEO slugs
export async function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }))
}

// Fixed Metadata for Next.js 15
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = getProjectBySlug(slug)

  if (!project) return { title: "Project Not Found" }

  return {
    title: `${project.title} | NorthCapitalDXB`,
    description: project.description.slice(0, 160),
    openGraph: { images: [project.image] },
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = getProjectBySlug(slug)
  if (!project) notFound()

    // --- 1. PREPARE THE SCHEMA DATA ---
  // Clean the price string (e.g., "AED 1,500,000" -> 1500000)
  const numericPrice = project.startingPrice
    ? parseInt(project.startingPrice.replace(/[^0-9]/g, ''))
    : 0

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": project.title,
    "image": [
      `https://www.northcapitaldxb.com${project.image}`, // Ensure absolute URL
      ...(project.gallery ? project.gallery.map(img => `https://www.northcapitaldxb.com${img}`) : [])
    ],
    "description": project.description,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Dubai",
      "addressRegion": "Dubai",
      "addressCountry": "AE",
      "streetAddress": project.location
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "AED",
      "price": numericPrice,
      "availability": "https://schema.org/InStock",
      "url": `https://www.northcapitaldxb.com/projects/${project.slug}`,
      "category": "Real Estate > Residential > " + (project.details.find(d => d.label === "Type")?.value || "Apartment")
    },
    "brand": {
      "@type": "Organization",
      "name": project.developer
    }
  }

  return (
    <>
      <Navbar />
      <main className="bg-background pt-24 pb-20">
        
        {/* HERO */}
        <section className="relative h-[60vh] w-full overflow-hidden md:h-[70vh]">
          <Image
            src={project.image}
            alt={project.title}
            fill
            className="object-cover brightness-75"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
            <div className="mx-auto max-w-7xl">
              <Badge className="mb-4 bg-accent text-accent-foreground">{project.status}</Badge>
              <h1 className="font-serif text-4xl font-bold text-white md:text-6xl">{project.title}</h1>
              <p className="mt-2 text-lg text-white/90 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-accent" /> {project.location} • by {project.developer}
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-12 lg:grid-cols-3">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-16">
              
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">Starting Price</p>
                  <p className="text-xl font-bold text-accent">{project.startingPrice}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">Payment Plan</p>
                  <p className="text-xl font-bold text-foreground">{project.details.find(d => d.label === "Payment Plan")?.value || "Flexible"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">Handover</p>
                  <p className="text-xl font-bold text-foreground">{project.completion || "TBC"}</p>
                </div>
              </div>

              {/* Description */}
              <section>
                <h2 className="font-serif text-3xl font-bold text-foreground mb-4">Why Invest Here?</h2>
                <h3 className="text-xl font-medium text-accent mb-4">{project.uniquenessTitle}</h3>
                <p className="text-lg leading-relaxed text-muted-foreground">{project.uniquenessDescription}</p>
                <p className="mt-4 leading-relaxed text-muted-foreground">{project.description}</p>
              </section>

              {/* Masterplan */}
              {project.masterplanImage && (
                <section id="masterplan">
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-6">Masterplan & Layout</h2>
                  <div className="overflow-hidden rounded-2xl border border-border shadow-lg">
                    <Image src={project.masterplanImage} alt="Masterplan" width={1000} height={600} className="w-full object-cover" />
                  </div>
                </section>
              )}

              {/* NEW SECTION 1: CONNECTIVITY */}
              {project.connectivity && project.connectivity.length > 0 && (
                <section>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-6">Location & Connectivity</h2>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    {project.connectivity.map((item, i) => (
                      <div key={i} className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center shadow-sm transition-all hover:border-accent/50">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                          <Car className="h-5 w-5" />
                        </div>
                        <p className="text-lg font-bold text-foreground">{item.duration}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{item.location}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Amenities */}
              <section>
                <h2 className="font-serif text-2xl font-bold text-foreground mb-6">World-Class Amenities</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {project.amenities?.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                      <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                      <span className="text-sm font-medium">{amenity}</span>
                    </div>
                  ))}
                </div>
              </section>



                  {/* NEW SECTION 2: FLOOR PLAN W/ LOCKED CONTENT */}
              {project.floorPlanImage && (
                <section id="floorplans" className="scroll-mt-24">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-serif text-2xl font-bold text-foreground">Floor Plans</h2>
                    <Badge variant="outline" className="border-accent text-accent">Available Now</Badge>
                  </div>
                  
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-muted shadow-lg">
                    {/* The Placeholder Image (Blurred or Clear) */}
                    <div className="relative aspect-[16/9] w-full">
                       <Image 
                        src={project.floorPlanImage} 
                        alt="Unit Layouts" 
                        fill
                        className="object-contain p-4"
                      />
                      {/* Optional: Blur overlay to encourage click */}
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                    </div>

                    {/* The CTA Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center bg-background/95 p-8 backdrop-blur-sm border-t border-border">
                       <div className="mb-4 flex items-center gap-2 text-muted-foreground">
                          <Lock className="h-4 w-4" />
                          <span className="text-sm">Unlock full brochure with unit sizes & types</span>
                       </div>

{/* The Popup Trigger */}
                       <Dialog>
                        <DialogTrigger asChild>
                          <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto">
                            <FileText className="mr-2 h-4 w-4" />
                            Get All Floor Plans
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] p-0 bg-transparent border-none shadow-none">
                           <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                              <DialogHeader className="p-6 pb-2">
                                 <DialogTitle>Unlock Floor Plans</DialogTitle>
                                 <DialogDescription>
                                   Enter your details to instantly access the PDF layout guide for {project.title}.
                                 </DialogDescription>
                              </DialogHeader>
                              <div className="p-6 pt-0">
                                <LeadForm minimal={true} />
                              </div>
                           </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </section>
              )}



              {/* Payment Plan */}
              {project.paymentPlanImage && (
                <section id="payment">
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-6">Payment Schedule</h2>
                  <div className="overflow-hidden rounded-2xl border border-border shadow-lg">
                     <Image src={project.paymentPlanImage} alt="Payment Plan" width={1000} height={600} className="w-full object-cover" />
                  </div>
                </section>
              )}
            </div>

            {/* RIGHT COLUMN: STICKY SIDEBAR */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">
                
                {/* REGISTER CARD */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
                  <div className="mb-6 text-center">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Limited Availability</p>
                    <h3 className="font-serif text-2xl font-bold text-foreground">Register Interest</h3>
                    <p className="text-xs text-muted-foreground mt-2">Download brochure & floor plans.</p>
                  </div>

                  <ROICalculator/>
                  
                  {/* POPUP TRIGGER */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                        <Download className="mr-2 h-4 w-4" />
                        Request Information
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-transparent border-none shadow-none">
                       {/* Using the new MINIMAL mode */}
                       <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                          <DialogHeader className="p-6 pb-2">
                             <DialogTitle>Download Brochure</DialogTitle>
                             <DialogDescription>
                               Complete the form to receive the official PDF factsheet for {project.title}.
                             </DialogDescription>
                          </DialogHeader>
                          <div className="p-6 pt-0">
                            <LeadForm minimal={true} />
                          </div>
                       </div>
                    </DialogContent>
                  </Dialog>
                  
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>Or call us: +971 4 123 4567</span>
                  </div>
                </div>

                <div className="rounded-xl bg-secondary p-4 text-xs text-muted-foreground">
                  <p><span className="font-bold text-foreground">Note:</span> Pre-launch units sell out fast. Pre-Registering ensures you get first choice of layout.</p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}