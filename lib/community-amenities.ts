export interface CommunityAmenities {
  malls: string[]
  hospitals: string[]
  schools: string[]
  landmarks: string[]
  highlights: string[]
}

const AMENITIES: Record<string, CommunityAmenities> = {
  "downtown-dubai": {
    malls: ["The Dubai Mall", "Souk Al Bahar"],
    hospitals: ["Mediclinic City Hospital", "Al Zahra Hospital"],
    schools: ["GEMS Wellington Primary", "Horizon English School"],
    landmarks: ["Burj Khalifa", "Dubai Fountain", "Dubai Opera", "Burj Park"],
    highlights: ["World's tallest building", "Most visited downtown globally", "Premium retail & F&B"],
  },
  "dubai-marina": {
    malls: ["Marina Mall", "The Beach at JBR"],
    hospitals: ["Mediclinic Meadows", "Emirates Hospital Clinics"],
    schools: ["Dubai British School Jumeirah Park", "Regent International School"],
    landmarks: ["Marina Walk", "Bluewaters Island", "Ain Dubai"],
    highlights: ["2.5km waterfront promenade", "72,000+ residents", "Metro & tram connected"],
  },
  "business-bay": {
    malls: ["Bay Avenue Mall", "The Dubai Mall (adjacent)"],
    hospitals: ["Aster Clinic Business Bay", "Saudi German Hospital (nearby)"],
    schools: ["JSS Private School", "GEMS Jumeirah Primary School (nearby)"],
    landmarks: ["Dubai Water Canal", "Executive Towers", "Conrad Dubai"],
    highlights: ["Central business district", "Canal waterfront living", "Metro connected"],
  },
  "palm-jumeirah": {
    malls: ["Nakheel Mall", "Golden Mile Galleria"],
    hospitals: ["Mediclinic Palm Jumeirah", "American Hospital (Jumeirah)"],
    schools: ["GEMS Wellington International", "Raffles International School"],
    landmarks: ["Atlantis The Palm", "The Pointe", "Palm Beach", "W Dubai – The Palm"],
    highlights: ["Man-made island landmark", "Private beach villas", "Ultra-luxury resort living"],
  },
  "jumeirah-village-circle": {
    malls: ["Circle Mall", "The Circle Community Mall"],
    hospitals: ["Mediclinic Parkview Hospital", "Karama Medical Centre (nearby)"],
    schools: ["JSS International School", "Sunmarke School", "Arcadia School"],
    landmarks: ["JVC Community Parks", "Halfa Park", "Five Jumeirah Village Hotel"],
    highlights: ["Affordable family community", "40+ community parks", "High rental yield potential"],
  },
  "dubai-hills-estate": {
    malls: ["Dubai Hills Mall"],
    hospitals: ["King's College Hospital Dubai", "Mediclinic Parkview Hospital"],
    schools: ["GEMS Wellington Academy Al Khail", "King's School Al Barsha", "Hartland International School"],
    landmarks: ["Dubai Hills Golf Club", "Dubai Hills Park", "Expo Golf Villas"],
    highlights: ["Master-planned green community", "18-hole championship golf course", "Direct mall access"],
  },
  "arabian-ranches": {
    malls: ["Ranches Souk", "Dubai Polo & Equestrian Club"],
    hospitals: ["Mediclinic Arabian Ranches", "Aster Clinic Al Barsha"],
    schools: ["Jumeirah English Speaking School (JESS)", "Ranches Primary School"],
    landmarks: ["Arabian Ranches Golf Club", "Dubai Polo Club", "Equestrian Centre"],
    highlights: ["Gated villa community", "Polo & equestrian lifestyle", "Low-density suburban feel"],
  },
  "damac-hills": {
    malls: ["Cityland Mall (nearby)", "DAMAC Hills Community Centre"],
    hospitals: ["Saudi German Hospital (nearby)", "Mediclinic Parkview (nearby)"],
    schools: ["Jebel Ali School", "GEMS Metropole School"],
    landmarks: ["Trump International Golf Club Dubai", "Akoya Park", "Malibu Beach"],
    highlights: ["Golf course living", "Trump-branded golf villas", "Lagoon & beach amenity"],
  },
  "al-barsha": {
    malls: ["Mall of the Emirates", "Al Barsha Mall"],
    hospitals: ["Mediclinic City Hospital (nearby)", "NMC Royal Hospital"],
    schools: ["American University of Dubai", "GEMS Al Barsha National School", "Al Mawakeb School"],
    landmarks: ["Ski Dubai", "Magic Planet", "Al Barsha Pond Park"],
    highlights: ["Mall of the Emirates hub", "Ski Dubai access", "Central location on SZR"],
  },
  "hor-al-anz": {
    malls: ["City Centre Deira", "Al Ghurair Centre", "Deira City Centre"],
    hospitals: ["Rashid Hospital", "Al Qusais Medical Centre", "NMC Specialty Hospital"],
    schools: ["Deira International School", "Dubai Modern Education School"],
    landmarks: ["Gold Souk", "Spice Souk", "Dubai Creek", "Al Fahidi Fort"],
    highlights: ["Dense residential Deira neighbourhood", "Metro-connected", "Strong rental demand"],
  },
  "bur-dubai": {
    malls: ["BurJuman Mall", "Lamcy Plaza"],
    hospitals: ["Dubai Hospital (Government)", "Iranian Hospital"],
    schools: ["Our Own English High School", "Pravasi Bharatiya School"],
    landmarks: ["Al Fahidi Historical Neighbourhood", "Dubai Museum", "Grand Mosque", "Textile Souk"],
    highlights: ["Historic old town", "Dubai Museum heritage hub", "Multicultural dining scene"],
  },
  "al-jadaf": {
    malls: ["Dubai Festival City Mall", "Wafi Mall (nearby)"],
    hospitals: ["Latifa Hospital", "Dubai Healthcare City (adjacent)"],
    schools: ["University of Wollongong Dubai", "Kings' School Nad Al Sheba (nearby)"],
    landmarks: ["Dubai Culture Village", "Al Jadaf Waterfront", "Dubai Creek (south bank)"],
    highlights: ["Emerging waterfront district", "Healthcare City proximity", "Canal views"],
  },
  "difc": {
    malls: ["Gate Village", "DIFC Retail Precinct"],
    hospitals: ["Mediclinic City Hospital", "American Hospital DIFC"],
    schools: ["Dubai International Academy (nearby)"],
    landmarks: ["Gate Building", "Burj Khalifa (adjacent)", "Dubai Opera (adjacent)", "Sculpture Garden"],
    highlights: ["Middle East financial hub", "World-class restaurants & galleries", "Premium Grade-A offices"],
  },
  "jumeirah-lake-towers": {
    malls: ["JLT Cluster D Retail", "Almas Tower retail"],
    hospitals: ["Mediclinic Meadows", "Emirates Hospital JLT"],
    schools: ["Dubai British School JLT", "Kids First Group nurseries"],
    landmarks: ["Almas Tower (DMCC HQ)", "JLT Lakes & Parks", "Cluster Plaza"],
    highlights: ["DMCC free zone hub", "Metro access", "Waterfront parks & lakes"],
  },
  "meydan": {
    malls: ["Meydan One Mall (upcoming)", "Dragon Mart (nearby)"],
    hospitals: ["Meydan Medical Centre", "Mediclinic Mirdif"],
    schools: ["GEMS Wellington School Meydan (upcoming)", "Meydan School"],
    landmarks: ["Meydan Racecourse", "Meydan Hotel", "The Track Golf Course", "Godolphin Gallery"],
    highlights: ["Horse racing capital of Dubai", "Luxury branded residences", "Al Meydan Road connectivity"],
  },
  "nad-al-shiba": {
    malls: ["Meydan One Mall (upcoming)", "Dragon Mart (nearby)"],
    hospitals: ["Meydan Medical Centre", "Mediclinic City Hospital (nearby)"],
    schools: ["GEMS Wellington School", "Kings' School Nad Al Sheba", "Hartland International School"],
    landmarks: ["Meydan Racecourse", "Mohammed Bin Rashid City", "Ras Al Khor Wildlife Sanctuary"],
    highlights: ["MBR City mega-development zone", "Racecourse proximity", "Fast-appreciating land bank"],
  },
}

export function getCommunityAmenities(slug: string): CommunityAmenities | null {
  return AMENITIES[slug] ?? null
}
