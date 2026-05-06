/**
 * Developer profiles keyed on exact dld_projects.developer_name (Arabic script).
 * Researched 2026-05. Sources: Wikipedia, DFM, company sites, DLD extract.
 *
 * BRAND_* placeholder keys exist for developers whose DLD entries appear under
 * project-specific SPVs not yet mapped (Binghatti, Danube, Select Group, etc.)
 *
 * DLD_NAME_VARIANTS maps additional SPV strings to their canonical key —
 * use for display-side consolidation (e.g. all Emaar SPVs → "Emaar Properties").
 */

export interface DeveloperProfile {
  brand_name: string
  founded: number
  hq: string
  type: "Luxury" | "Affordable" | "Mid-market" | "Ultra-luxury" | "Mixed"
  flagship_project: string
  active_areas: string[]
  listed: boolean
  tagline: string
}

export const DEVELOPER_PROFILES: Record<string, DeveloperProfile> = {
  // Emaar (DFM listed) — #4 by DLD units (43,301)
  "اعمار العقارية (ش . م. ع)": {
    brand_name: "Emaar Properties",
    founded: 1997,
    hq: "Dubai",
    type: "Mixed",
    flagship_project: "Burj Khalifa / Downtown Dubai",
    active_areas: ["Downtown Dubai", "Dubai Hills Estate", "Dubai Creek Harbour"],
    listed: true,
    tagline: "Iconic master-planned communities and Dubai's defining skyline",
  },
  // DAMAC (formerly DFM listed, taken private 2022) — largest private luxury dev
  "شركة داماك العقارية (ش.ذ.م.م)": {
    brand_name: "DAMAC Properties",
    founded: 2002,
    hq: "Dubai",
    type: "Luxury",
    flagship_project: "DAMAC Hills",
    active_areas: ["DAMAC Hills", "Business Bay", "Jumeirah Village Circle"],
    listed: false,
    tagline: "Dubai's largest private luxury developer with branded residences",
  },
  // Nakheel — #2 by DLD units (53,571), now subsidiary of Dubai Holding
  "شركة نخيل (ش.م.خ)": {
    brand_name: "Nakheel",
    founded: 2001,
    hq: "Dubai",
    type: "Mixed",
    flagship_project: "Palm Jumeirah",
    active_areas: ["Palm Jumeirah", "Jumeirah Village Circle", "Al Furjan"],
    listed: false,
    tagline: "Creator of Palm Jumeirah and Dubai's iconic island communities",
  },
  // Meraas — now subsidiary of Dubai Holding Real Estate
  "مراس العقارية (ش.ذ.م.م)": {
    brand_name: "Meraas",
    founded: 2007,
    hq: "Dubai",
    type: "Luxury",
    flagship_project: "Bluewaters Island",
    active_areas: ["Bluewaters Island", "City Walk", "Jumeirah"],
    listed: false,
    tagline: "Lifestyle-led destinations redefining how Dubai lives and plays",
  },
  // Dubai Properties (legacy entity under Dubai Holding umbrella)
  "دبي للعقارات (ش.ذ.م.م)": {
    brand_name: "Dubai Holding Real Estate",
    founded: 2004,
    hq: "Dubai",
    type: "Mixed",
    flagship_project: "Madinat Jumeirah Living",
    active_areas: ["Jumeirah", "Business Bay", "Dubai Harbour"],
    listed: false,
    tagline: "Government-backed holding spanning Nakheel, Meraas, and Dubai Properties",
  },
  // Sobha — #7 by DLD units (26,295); sukuk listed Nasdaq Dubai/LSE, equity not listed
  "شوبا ش.ذ.م.م": {
    brand_name: "Sobha Realty",
    founded: 1976,
    hq: "Dubai",
    type: "Luxury",
    flagship_project: "Sobha Hartland",
    active_areas: ["Mohammed Bin Rashid City", "Sobha Hartland", "Hartland II"],
    listed: false,
    tagline: "Vertically integrated luxury developer with in-house construction",
  },
  // Azizi — high-volume mid-market, strong Meydan/MBR City presence
  "عزيزي ديفليوبمنتس ش.ذ.م.م": {
    brand_name: "Azizi Developments",
    founded: 2007,
    hq: "Dubai",
    type: "Mid-market",
    flagship_project: "Azizi Riviera",
    active_areas: ["Meydan / MBR City", "Al Furjan", "Palm Jumeirah"],
    listed: false,
    tagline: "High-volume mid-market developer across Meydan and Al Furjan",
  },
  // Ellington — boutique design-led luxury
  "إلينجتون كارما للتطوير ذ.م.م": {
    brand_name: "Ellington Properties",
    founded: 2014,
    hq: "Dubai",
    type: "Luxury",
    flagship_project: "DT1",
    active_areas: ["Jumeirah Village Circle", "Downtown Dubai", "Business Bay"],
    listed: false,
    tagline: "Design-led boutique developer crafting refined residential environments",
  },
  // MAG
  "ام ايه اس للتطوير العقاري ش.ذ.م.م": {
    brand_name: "MAG Property Development",
    founded: 2003,
    hq: "Dubai",
    type: "Mid-market",
    flagship_project: "MAG City",
    active_areas: ["Mohammed Bin Rashid City", "Jumeirah Lakes Towers", "Dubai South"],
    listed: false,
    tagline: "Established mid-market developer with strong MBR City presence",
  },
  // Majid Al Futtaim
  "ماجد الفطيم لتشغيل مشاريع المدن المتكاملة الاماراتية ش.ذ.م.م": {
    brand_name: "Majid Al Futtaim Properties",
    founded: 1992,
    hq: "Dubai",
    type: "Mixed",
    flagship_project: "Tilal Al Ghaf",
    active_areas: ["Tilal Al Ghaf", "Al Zahia", "Waterfront City"],
    listed: false,
    tagline: "Retail-anchored master communities built around Mall of the Emirates",
  },
  // Aldar (ADX listed — Abu Dhabi, expanding into Dubai)
  "ALDAR_BRAND": {
    brand_name: "Aldar Properties",
    founded: 2004,
    hq: "Abu Dhabi",
    type: "Mixed",
    flagship_project: "Yas Island",
    active_areas: ["Dubai South", "Mohammed Bin Rashid City", "Dubailand"],
    listed: true,
    tagline: "Abu Dhabi's largest listed developer reshaping Dubai's market",
  },
  // Binghatti (SPV-registered, no single DLD name)
  "BINGHATTI_BRAND": {
    brand_name: "Binghatti",
    founded: 2008,
    hq: "Dubai",
    type: "Luxury",
    flagship_project: "Bugatti Residences by Binghatti",
    active_areas: ["Business Bay", "Downtown Dubai", "Jumeirah Village Circle"],
    listed: false,
    tagline: "Architecturally distinct towers with ultra-luxury branded residences",
  },
  // Danube
  "DANUBE_BRAND": {
    brand_name: "Danube Properties",
    founded: 2014,
    hq: "Dubai",
    type: "Affordable",
    flagship_project: "Viewz by Danube",
    active_areas: ["Jumeirah Village Circle", "Arjan", "Jumeirah Lake Towers"],
    listed: false,
    tagline: "Dubai's leading affordable developer, 1% monthly payment plans",
  },
  // Select Group
  "SELECT_GROUP_BRAND": {
    brand_name: "Select Group",
    founded: 2002,
    hq: "Dubai",
    type: "Luxury",
    flagship_project: "Marina Gate",
    active_areas: ["Dubai Marina", "Business Bay", "Palm Jumeirah"],
    listed: false,
    tagline: "Premium waterfront developer behind Dubai Marina's tallest towers",
  },
  // Omniyat
  "OMNIYAT_BRAND": {
    brand_name: "Omniyat",
    founded: 2005,
    hq: "Dubai",
    type: "Ultra-luxury",
    flagship_project: "The Opus by Zaha Hadid",
    active_areas: ["Business Bay", "Palm Jumeirah", "Downtown Dubai"],
    listed: false,
    tagline: "Architectural ultra-luxury developer collaborating with global icons",
  },
  // Deyaar (DFM listed: DEYAAR)
  "DEYAAR_BRAND": {
    brand_name: "Deyaar Development",
    founded: 2002,
    hq: "Dubai",
    type: "Mid-market",
    flagship_project: "Midtown Dubai Production City",
    active_areas: ["Dubai Production City", "Business Bay", "Al Furjan"],
    listed: true,
    tagline: "DFM-listed developer pivoting to premium with Regalia tower",
  },
  // Samana
  "SAMANA_BRAND": {
    brand_name: "Samana Developers",
    founded: 2017,
    hq: "Dubai",
    type: "Affordable",
    flagship_project: "Samana Greens",
    active_areas: ["Arjan", "Dubai Studio City", "Jumeirah Village Circle"],
    listed: false,
    tagline: "Top-5 Dubai developer by volume, known for private pool apartments",
  },
}

/**
 * Maps additional DLD developer_name strings (SPVs) to the canonical key above.
 * Use this to consolidate multi-SPV developers for display.
 */
export const DLD_NAME_VARIANTS: Record<string, string> = {
  // Emaar SPVs
  "إعمار للتطوير (مساهمة عامة)":                  "اعمار العقارية (ش . م. ع)",
  "إعمار دبي الجنوب دي دبليو سي ش.ذ.م.م":        "اعمار العقارية (ش . م. ع)",
  "دبي هيلز استيت ش.ذ.م.م":                      "اعمار العقارية (ش . م. ع)",
  "دبي كريك هاربور ش.ذ.م.م":                     "اعمار العقارية (ش . م. ع)",
  "اعمار بوادي (ذ م م)":                          "اعمار العقارية (ش . م. ع)",
  "دي دابليو تي سي إعمار ذ.م.م":                  "اعمار العقارية (ش . م. ع)",
  // DAMAC SPVs
  "داماك كريسنت للعقارات (ش.ذ.م.م)":              "شركة داماك العقارية (ش.ذ.م.م)",
  "داماك ميري للاستثمار ش.ذ.م.م":                 "شركة داماك العقارية (ش.ذ.م.م)",
  "داماك سي اس ال للاستثمار ش.ذ.م.م":             "شركة داماك العقارية (ش.ذ.م.م)",
  "داماك ورلد ريل استيت ش.ذ.م.م":                 "شركة داماك العقارية (ش.ذ.م.م)",
  "شركة داماك ايليت للاستثمار ذ.م.م":             "شركة داماك العقارية (ش.ذ.م.م)",
  // Nakheel SPVs
  "شركة النخلة - جميرا (ش.ذ.م.م)":               "شركة نخيل (ش.م.خ)",
  "النخلة  - ديره (ش.ذ.م.م)":                    "شركة نخيل (ش.م.خ)",
  // Meraas SPVs
  "مراس باي أند ريزيدنس ش.ذ.م.م":                "مراس العقارية (ش.ذ.م.م)",
  "سيتي ووك ريزيدينشال 1 ش.ذ.م.م":               "مراس العقارية (ش.ذ.م.م)",
}

/**
 * Lookup a developer profile by their DLD name string.
 * Checks canonical key first, then SPV variant map.
 */
export function getDeveloperProfile(dldName: string): DeveloperProfile | null {
  return DEVELOPER_PROFILES[dldName] ?? DEVELOPER_PROFILES[DLD_NAME_VARIANTS[dldName] ?? ""] ?? null
}

/** Type badge colors */
export const TYPE_COLORS: Record<DeveloperProfile["type"], string> = {
  "Ultra-luxury": "text-purple-400 bg-purple-400/10 border-purple-400/20",
  "Luxury":       "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "Mixed":        "text-[#00BFA5] bg-[#00BFA5]/10 border-[#00BFA5]/20",
  "Mid-market":   "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "Affordable":   "text-muted-foreground bg-muted/20 border-border/40",
}
