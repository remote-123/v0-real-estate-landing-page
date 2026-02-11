export interface Project {
  slug: string
  title: string
  location: string
  developer: string
  type: string
  startingPrice: string
  roi: string
  status: string
  image: string
  description: string
  highlights: string[]
  details: {
    label: string
    value: string
  }[]
}

export const projects: Project[] = [
  {
    slug: "marina-skyline-residences",
    title: "Marina Skyline Residences",
    location: "Dubai Marina",
    developer: "Select Group",
    type: "Luxury Apartments",
    startingPrice: "AED 1.8M",
    roi: "8-10% Net Yield",
    status: "Selling Now",
    image: "/images/project-marina.jpg",
    description:
      "Rising 60 stories above the iconic Dubai Marina, Marina Skyline Residences offers uninterrupted views of the Arabian Gulf and JBR Beach. This flagship development combines world-class amenities with a prime waterfront address, making it one of the most sought-after investment opportunities in the emirate.",
    highlights: [
      "Direct access to Dubai Marina Walk and JBR Beach",
      "Infinity pool and sky lounge on the rooftop",
      "Managed by a leading hospitality brand",
      "5-year post-handover payment plan available",
    ],
    details: [
      { label: "Unit Types", value: "Studio, 1BR, 2BR, 3BR" },
      { label: "Completion", value: "Q4 2027" },
      { label: "Payment Plan", value: "60/40" },
      { label: "Service Charge", value: "AED 18/sqft" },
      { label: "Area Size", value: "450 - 2,400 sqft" },
      { label: "Floors", value: "60" },
    ],
  },
  {
    slug: "creek-villas-by-emaar",
    title: "Creek Villas by Emaar",
    location: "Dubai Creek Harbour",
    developer: "Emaar Properties",
    type: "Waterfront Villas",
    startingPrice: "AED 3.5M",
    roi: "6-8% Net Yield",
    status: "Pre-Launch",
    image: "/images/project-creek.jpg",
    description:
      "Set within the 6 million sqft Dubai Creek Harbour masterplan, these exclusive waterfront villas offer a rare combination of creek views, lush landscaping, and proximity to Downtown Dubai. Developed by Emaar, each villa is crafted with premium finishes and designed for elevated family living.",
    highlights: [
      "Direct waterfront access with private gardens",
      "Walking distance to Dubai Creek Tower",
      "Premium Emaar finishes and smart home features",
      "Gated community with 24/7 security",
    ],
    details: [
      { label: "Unit Types", value: "3BR, 4BR, 5BR Villas" },
      { label: "Completion", value: "Q2 2028" },
      { label: "Payment Plan", value: "70/30" },
      { label: "Service Charge", value: "AED 6/sqft" },
      { label: "Plot Size", value: "3,200 - 8,000 sqft" },
      { label: "Developer", value: "Emaar Properties" },
    ],
  },
  {
    slug: "downtown-panorama-tower",
    title: "Downtown Panorama Tower",
    location: "Downtown Dubai",
    developer: "DAMAC Properties",
    type: "Premium Penthouses",
    startingPrice: "AED 5.2M",
    roi: "7-9% Net Yield",
    status: "Limited Units",
    image: "/images/project-downtown.jpg",
    description:
      "Downtown Panorama Tower is a landmark residential tower in the heart of Dubai, offering sweeping views of the Burj Khalifa and Dubai Fountain. This ultra-premium development features a curated collection of penthouses with bespoke interiors and private elevator access.",
    highlights: [
      "Panoramic Burj Khalifa and Fountain views",
      "Private elevator and dedicated concierge",
      "Branded interiors by an international design house",
      "Steps from Dubai Mall and DIFC",
    ],
    details: [
      { label: "Unit Types", value: "2BR, 3BR, 4BR Penthouses" },
      { label: "Completion", value: "Q1 2027" },
      { label: "Payment Plan", value: "50/50" },
      { label: "Service Charge", value: "AED 25/sqft" },
      { label: "Area Size", value: "2,000 - 6,500 sqft" },
      { label: "Floors", value: "45" },
    ],
  },
  {
    slug: "hills-estate-villas",
    title: "Hills Estate Villas",
    location: "Dubai Hills",
    developer: "Meraas",
    type: "Golf Course Villas",
    startingPrice: "AED 4.8M",
    roi: "6-7% Net Yield",
    status: "Selling Now",
    image: "/images/project-hills.jpg",
    description:
      "Nestled within the green belt of Dubai Hills Estate, these exclusive golf course villas offer resort-style living in the center of new Dubai. With views of the championship golf course and easy access to Dubai Hills Mall, this community is ideal for families and lifestyle investors.",
    highlights: [
      "Championship golf course frontage",
      "Proximity to Dubai Hills Mall and schools",
      "Landscaped parks and running trails",
      "Smart home automation included",
    ],
    details: [
      { label: "Unit Types", value: "4BR, 5BR, 6BR Villas" },
      { label: "Completion", value: "Ready to Move In" },
      { label: "Payment Plan", value: "Full Payment" },
      { label: "Service Charge", value: "AED 5/sqft" },
      { label: "Plot Size", value: "5,000 - 12,000 sqft" },
      { label: "Developer", value: "Meraas" },
    ],
  },
  {
    slug: "palm-beachfront-residences",
    title: "Palm Beachfront Residences",
    location: "Palm Jumeirah",
    developer: "Nakheel",
    type: "Beachfront Apartments",
    startingPrice: "AED 6.5M",
    roi: "5-7% Net Yield",
    status: "Pre-Launch",
    image: "/images/project-palm.jpg",
    description:
      "An iconic addition to the world-famous Palm Jumeirah, these beachfront residences offer private beach access, panoramic ocean views, and ultra-luxury finishes. Developed by Nakheel, this project represents the pinnacle of coastal living in the Middle East.",
    highlights: [
      "Private beach access for every resident",
      "Infinity pool with Arabian Gulf views",
      "Direct monorail access to mainland",
      "World-class spa and fitness facilities",
    ],
    details: [
      { label: "Unit Types", value: "2BR, 3BR, 4BR Apartments" },
      { label: "Completion", value: "Q3 2028" },
      { label: "Payment Plan", value: "60/40" },
      { label: "Service Charge", value: "AED 22/sqft" },
      { label: "Area Size", value: "1,800 - 5,200 sqft" },
      { label: "Developer", value: "Nakheel" },
    ],
  },
  {
    slug: "south-heights-tower",
    title: "South Heights Tower",
    location: "Dubai South",
    developer: "Azizi Developments",
    type: "Investment Apartments",
    startingPrice: "AED 680K",
    roi: "9-12% Net Yield",
    status: "Selling Now",
    image: "/images/project-south.jpg",
    description:
      "Strategically located near Al Maktoum International Airport and the Expo City district, South Heights Tower is designed for high-yield investors. With competitive entry prices and strong rental demand driven by the area's rapid commercial growth, this is a smart entry point into the Dubai market.",
    highlights: [
      "Highest projected rental yields in Dubai",
      "Adjacent to Expo City and Al Maktoum Airport",
      "Affordable entry point for first-time investors",
      "Flexible 1% monthly payment plan",
    ],
    details: [
      { label: "Unit Types", value: "Studio, 1BR, 2BR" },
      { label: "Completion", value: "Q2 2026" },
      { label: "Payment Plan", value: "1% Monthly" },
      { label: "Service Charge", value: "AED 12/sqft" },
      { label: "Area Size", value: "380 - 1,200 sqft" },
      { label: "Floors", value: "32" },
    ],
  },
]

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}
