export interface Project {
  slug: string
  title: string
  location: string
  developer: string
  type: string
  category: "Apartments" | "Villas" | "Townhouses" | "Penthouses"
  startingPrice: string
  roi: string
  status: "Upcoming" | "Featured" | "Selling Now" | "Pre-Launch" | "Sold Out"
  completion: string // e.g. "Q3 2028"
  
  // Images
  image: string // Hero Image
  gallery: string[] // Array of 3-4 lifestyle shots
  masterplanImage?: string // Screenshot of map/layout
  paymentPlanImage?: string // Screenshot of the payment schedule table
  
  // Marketing Text
  uniquenessTitle: string
  uniquenessDescription: string
  
  description: string
  amenities: string[] // e.g. ["Infinity Pool", "Private Beach", "Valet"]
  
  details: { label: string; value: string }[]
  // NEW FIELDS
  floorPlanImage?: string
  connectivity: {
    location: string
    duration: string // e.g. "15 Min"
  }[]
}

// Example Data Entry
export const projects: Project[] = [
  {
    slug: "altan-dubai-creek",
    title: "Altan at Dubai Creek Harbour",
    location: "Dubai Creek Harbour",
    developer: "Emaar",
    type: "Waterfront Apartments",
    category: "Apartments",
    startingPrice: "AED 1.8M",
    roi: "8% Net",
    status: "Pre-Launch",
    completion: "Q4 2028",
    image: "/images/case-beachfront.jpg",
    gallery: ["/images/altan-1.jpg", "/images/altan-2.jpg", "/images/altan-3.jpg"],
    masterplanImage: "/images/altan-masterplan.jpg", 
    paymentPlanImage: "/images/altan-payment-plan.jpg",
    uniquenessTitle: "The Last Waterfront Plot in Creek Harbour",
    uniquenessDescription: "Altan represents the final opportunity to secure a frontline residence in the Creek Beach district. Unlike previous launches, this tower offers direct private beach access and unobstructed sunset views over the Burj Khalifa skyline.",
    description: "Experience a unique waterfront enclave where contemporary luxury meets nature...",
    amenities: ["Private Creek Beach", "Infinity Pool", "Fully Equipped Gym", "Kids Play Area", "BBQ Stations", "Concierge Service"],
    details: [
      { label: "Unit Types", value: "1, 2, 3 BR" },
      { label: "Payment Plan", value: "80/20" },
    ],
    floorPlanImage: "/images/altan-floorplan-sample.jpg",
    connectivity: [
      { location: "Downtown Dubai", duration: "10 Min" },
      { location: "Dubai Int. Airport", duration: "15 Min" },
      { location: "Dubai Marina", duration: "25 Min" },
      { location: "Jumeirah Beach", duration: "20 Min" },
    ],
  },
  // ... other projects
]

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}