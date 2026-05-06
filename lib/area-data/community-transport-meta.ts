/**
 * Community transport, yield, and pricing metadata.
 * Researched 2026-05 — Dubai Metro, RTA bus, Bayut/Driven rental yield reports.
 * Seeded into community_transport_meta DB table via scripts/seed/seed-community-transport.ts
 */

export interface CommunityTransportMeta {
  metro: string[]
  bus: string[]
  tram: boolean
  yield_range: string
  psf_range: string
  community_type: string
  notable_streets: string[]
}

export const COMMUNITY_TRANSPORT_META: Record<string, CommunityTransportMeta> = {
  "downtown-dubai": {
    metro: ["Burj Khalifa/Dubai Mall (Red Line)", "Business Bay (Red Line)"],
    bus: ["27", "29", "X25"],
    tram: false,
    yield_range: "4.5–6.5%",
    psf_range: "AED 2,200–3,500",
    community_type: "Mixed-use CBD / luxury apartments",
    notable_streets: ["Sheikh Mohammed Bin Rashid Blvd", "Emaar Boulevard"],
  },
  "dubai-marina": {
    metro: ["DMCC (Red Line)", "Dubai Marina (Red Line)"],
    bus: ["8", "84", "N55"],
    tram: true,
    yield_range: "5.5–7.5%",
    psf_range: "AED 1,600–2,800",
    community_type: "Waterfront high-rise apartments",
    notable_streets: ["Marina Walk", "Sheikh Zayed Road frontage"],
  },
  "business-bay": {
    metro: ["Business Bay (Red Line)"],
    bus: ["27", "29", "88"],
    tram: false,
    yield_range: "5.5–7.5%",
    psf_range: "AED 1,500–2,400",
    community_type: "Mixed-use CBD / canal-front apartments",
    notable_streets: ["Al A'amal Street", "Business Bay Crossing"],
  },
  "palm-jumeirah": {
    metro: ["No metro — Palm Monorail (trunk to Atlantis)"],
    bus: ["8", "84"],
    tram: false,
    yield_range: "3.5–5.5%",
    psf_range: "AED 3,000–6,500",
    community_type: "Iconic waterfront / ultra-luxury villas & apartments",
    notable_streets: ["Palm Trunk Road", "Frond A–W residential spines"],
  },
  "jumeirah-village-circle": {
    metro: ["No metro — nearest: Dubai Internet City (Red Line)"],
    bus: ["J01", "F37"],
    tram: false,
    yield_range: "6.5–8.5%",
    psf_range: "AED 900–1,400",
    community_type: "Affordable suburban / mixed apartments & townhouses",
    notable_streets: ["Circle Mall Ring Road", "Al Asayel Street"],
  },
  "dubai-hills-estate": {
    metro: ["No metro — nearest: Equiti (Red Line, ~5 km)"],
    bus: ["X22", "F37"],
    tram: false,
    yield_range: "4.5–6.0%",
    psf_range: "AED 1,800–2,800",
    community_type: "Master-planned green community / villas & mid-rise apartments",
    notable_streets: ["Dubai Hills Avenue", "King Salman Bin Abdulaziz Al Saud St"],
  },
  "arabian-ranches": {
    metro: ["No metro — car-dependent"],
    bus: ["J02"],
    tram: false,
    yield_range: "4.5–5.5%",
    psf_range: "AED 1,600–2,400",
    community_type: "Gated villa community / equestrian lifestyle",
    notable_streets: ["Al Qudra Road", "Polo Club Road"],
  },
  "damac-hills": {
    metro: ["No metro — car-dependent"],
    bus: ["J03"],
    tram: false,
    yield_range: "5.5–7.5%",
    psf_range: "AED 900–1,600",
    community_type: "Golf community / villas, townhouses & apartments",
    notable_streets: ["Al Qudra Road", "Trump International Golf Club Drive"],
  },
  "al-barsha": {
    metro: ["Mall of the Emirates (Red Line)"],
    bus: ["F35", "21", "23"],
    tram: false,
    yield_range: "5.5–7.0%",
    psf_range: "AED 800–1,400",
    community_type: "Established mid-density residential / villas & apartments",
    notable_streets: ["Al Barsha 1 Main Street", "Sheikh Zayed Road service road"],
  },
  "hor-al-anz": {
    metro: ["Abu Hail (Green Line)", "Al Qiyadah (Green Line)"],
    bus: ["10", "12", "C7"],
    tram: false,
    yield_range: "6.0–8.0%",
    psf_range: "AED 550–900",
    community_type: "Affordable Deira residential / low-rise apartments",
    notable_streets: ["Hor Al Anz Street", "Abu Hail Road"],
  },
  "bur-dubai": {
    metro: ["BurJuman (Red & Green Lines)", "ADCB (Green Line)", "Khalid Bin Al Waleed (Green Line)"],
    bus: ["6", "19", "44"],
    tram: false,
    yield_range: "6.0–8.5%",
    psf_range: "AED 700–1,100",
    community_type: "Historic urban core / affordable to mid-range apartments",
    notable_streets: ["Khalid Bin Al Waleed Road", "Al Mankhool Road"],
  },
  "al-jadaf": {
    metro: ["Al Jaddaf (Green Line)"],
    bus: ["C10", "C11"],
    tram: false,
    yield_range: "5.5–7.5%",
    psf_range: "AED 1,200–1,900",
    community_type: "Emerging waterfront / apartments near Dubai Healthcare City",
    notable_streets: ["Al Jaddaf Waterfront", "Culture Village Drive"],
  },
  "difc": {
    metro: ["Financial Centre (Red Line)"],
    bus: ["29", "C10"],
    tram: false,
    yield_range: "5.0–7.5%",
    psf_range: "AED 2,000–4,200",
    community_type: "Financial district / luxury apartments & lofts",
    notable_streets: ["Gate Avenue", "Al Sa'ada Street"],
  },
  "jumeirah-lake-towers": {
    metro: ["DMCC (Red Line)", "Jumeirah Lakes Towers (Red Line)"],
    bus: ["8", "84", "JLT1"],
    tram: true,
    yield_range: "6.5–8.0%",
    psf_range: "AED 1,100–1,800",
    community_type: "High-rise mixed-use / apartments & offices around lakes",
    notable_streets: ["Cluster A–Z ring roads", "Al Thanyah 5 (DMCC)"],
  },
  "meydan": {
    metro: ["No metro — Blue Line planned 2029"],
    bus: [],
    tram: false,
    yield_range: "5.5–7.0%",
    psf_range: "AED 1,200–2,000",
    community_type: "Racecourse district / luxury apartments & villas",
    notable_streets: ["Meydan Avenue", "Meydan Road (D69)"],
  },
  "nad-al-shiba": {
    metro: ["No metro — Blue Line planned 2029"],
    bus: [],
    tram: false,
    yield_range: "5.5–7.5%",
    psf_range: "AED 900–1,600",
    community_type: "Emerging low-density / villas & townhouses near Meydan",
    notable_streets: ["Nad Al Sheba Road", "Al Ain Road (E66) interchange"],
  },
}

export function getCommunityTransportMeta(slug: string): CommunityTransportMeta | null {
  return COMMUNITY_TRANSPORT_META[slug] ?? null
}
