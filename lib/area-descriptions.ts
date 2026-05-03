/**
 * Short institutional-tone descriptions for Dubai communities.
 * Keyed by DLD area_name_en (lowercase slug).
 */
const DESCRIPTIONS: Record<string, string> = {
  "downtown dubai":
    "Dubai's highest-density luxury core. Home to Burj Khalifa, Dubai Mall, and the Opera District. Dominated by high-rise apartments with strong short-term rental demand and premium PSF. Entry-level units start above AED 1,500 PSF, with penthouses reaching AED 5,000+. Limited land supply creates structural price floor.",

  "dubai marina":
    "One of the world's largest man-made marina developments. 200+ towers lining a 3.5km waterway with walkable retail, dining, and direct beach access via The Walk. Strong rental demand from expats and tourism. High transaction velocity makes it one of the most liquid sub-markets in the city.",

  "business bay":
    "The CBD extension south of Downtown. Mixed residential-commercial density with canal frontage and direct connectivity to Sheikh Zayed Road and the Metro. Attracts end-users and investors seeking Downtown proximity at a 20–30% PSF discount. Significant off-plan pipeline from tier-1 developers.",

  "palm jumeirah":
    "The iconic palm-shaped island and Dubai's most recognised address globally. Combines beach villas, signature apartments, and ultra-luxury hotel residences. Frond villas command the highest land values in the emirate. Atlantis The Palm and One&Only anchor the resort corridor. Capital appreciation driven by scarcity and global brand recognition.",

  "jumeirah village circle":
    "One of Dubai's highest-volume affordable investment communities. Circular master plan with ~2,000 buildings across residential clusters. Strong gross yields (6–8%) attract buy-to-let investors. Large off-plan pipeline from boutique developers. Lacks metro access but benefits from Al Khail Road connectivity.",

  "dubai hills estate":
    "Emaar's flagship integrated community spanning 11 million sqm. Golf course, hospital, school catchment, and Dubai Hills Mall create self-contained lifestyle infrastructure. Price premium over surrounding communities reflects master-developer quality. Mix of apartments and villas with distinct sub-communities.",

  "arabian ranches":
    "Emaar's original villa-community blueprint, launched in 2004. Established landscaping, top-ranked schools (JESS, Jumeirah English Speaking School), and a golf course create strong family demand. Limited resale inventory supports prices. Phases I, II, and III each carry distinct price positioning.",

  "damac hills":
    "DAMAC's golf-centred master community anchored by Trump International Golf Club. Phased delivery across 10 years has built a self-sufficient community with retail, schools, and park amenities. Strong value proposition relative to Emaar villa communities. Active rental market from golf-lifestyle seekers.",

  "al barsha":
    "Established mid-market residential district adjacent to Mall of the Emirates. Predominantly villa and low-rise apartment stock. Metro access (Mall of the Emirates station) supports rental demand. More affordable alternative to JVC and JLT for families. High proportion of owner-occupied units.",

  "deira":
    "Dubai's historic commercial and trading heartland on the creek's north bank. Dense apartment stock with strong rental demand from logistics, retail, and hospitality workers. Some of the city's lowest PSF values combined with high gross yields. Government-led urban renewal via Dubai Creek Harbour is reshaping the eastern edge.",

  "bur dubai":
    "Historic district on the south bank of Dubai Creek. Mix of traditional market areas and modern commercial corridors. Dense mid-market apartment supply with an established expat tenant base. Heritage zones (Al Fahidi, Textile Souk) attract tourism. Infrastructure investment is driving selective regeneration.",

  "dubai creek harbour":
    "Emaar's 6 sq km waterfront mega-development positioned as the new city centre. Creek Tower — set to surpass Burj Khalifa — anchors the skyline. First phases are delivered and occupied; later phases represent off-plan opportunity. Strong infrastructure investment underpins long-term price trajectory.",

  "difc":
    "Dubai International Financial Centre — the region's foremost financial free zone. Ultra-premium residential supply serves DIFC professionals and C-suite residents. Gate Avenue provides walkable F&B and retail. Highest corporate governance standards in the region. Residential yield compressed by capital values but tenant quality is unmatched.",

  "jumeirah lake towers":
    "80-tower mixed-use cluster around three artificial lakes adjacent to Dubai Marina. Strong metro connectivity (two stations). Appeals to young professionals seeking Marina lifestyle at lower price points. Commercial tower oversupply creates downward pressure on office rents but residential demand remains resilient.",

  "meydan":
    "Racing and lifestyle district anchored by Meydan Racecourse and the Mohammed Bin Rashid City master plan. District One's crystal lagoon community within MBR City is among Dubai's most prestigious villa addresses. Strong price appreciation driven by limited supply and flagship developer backing.",

  "sobha hartland":
    "Sobha Realty's premium waterfront community within Mohammed Bin Rashid City. Direct canal access, Hartland International School, and proximity to Downtown Dubai support strong end-user demand. Sobha's in-house construction delivers above-average quality finishes. Consistent appreciation since phase-1 handover.",
}

/**
 * Returns a description for a community by DLD area_name_en.
 * Case-insensitive match. Returns null if not found.
 */
export function getAreaDescription(areaNameEn: string): string | null {
  return DESCRIPTIONS[areaNameEn.toLowerCase()] ?? null
}
