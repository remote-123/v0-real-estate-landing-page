/**
 * 011_nc_areas.ts
 *
 * Creates nc_areas — North Capital canonical area reference table.
 *
 * Resolves the DLD cryptic name ↔ retail/community name mapping problem.
 * All terminal pages that filter by area should join through this table
 * instead of the old area_name_mapping.
 *
 * Run: npx tsx --env-file=.env.local scripts/migrate/011_nc_areas.ts
 */

import { sql } from "../ingest/db-client"

// ── Schema ────────────────────────────────────────────────────────────────────

async function createTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS nc_areas (
      slug              TEXT PRIMARY KEY,
      display_name      TEXT NOT NULL,
      aliases           TEXT[]   DEFAULT '{}',
      dld_area_names    TEXT[]   DEFAULT '{}',
      propsearch_slug   TEXT,
      area_type         TEXT     NOT NULL DEFAULT 'master-community',
      parent_slug       TEXT     REFERENCES nc_areas(slug),
      developer         TEXT,
      display_order     INT,
      notes             TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS nc_areas_dld_gin  ON nc_areas USING GIN (dld_area_names)`
  await sql`CREATE INDEX IF NOT EXISTS nc_areas_parent   ON nc_areas (parent_slug)`
  await sql`CREATE INDEX IF NOT EXISTS nc_areas_type     ON nc_areas (area_type)`
  console.log("✓ nc_areas table + indexes")
}

// ── Seed data ─────────────────────────────────────────────────────────────────
//
// dld_area_names: exact strings from dld_transactions.area_name_en
// propsearch_slug: matches prop_areas.slug (nullable if no propsearch coverage)
// area_type: master-community | sub-community | district | dld-zone | free-zone
// parent_slug: for sub-communities, references the parent nc_areas.slug

type AreaSeed = {
  slug: string
  display_name: string
  aliases?: string[]
  dld_area_names: string[]
  propsearch_slug?: string
  area_type: string
  parent_slug?: string
  developer?: string
  display_order?: number
  notes?: string
}

const AREAS: AreaSeed[] = [
  // ── Tier 1: Standalone master communities (DLD name = same zone) ────────────

  {
    slug: 'dubai-marina',
    display_name: 'Dubai Marina',
    aliases: ['Marsa Dubai', 'Marina', 'JBR area'],
    dld_area_names: ['Marsa Dubai'],
    propsearch_slug: 'dubai-marina',
    area_type: 'master-community',
    developer: 'Various (Emaar, Cayan, DAMAC, Nakheel)',
    display_order: 1,
    notes: 'DLD uses Arabic name "Marsa Dubai". Includes JBR (Jumeirah Beach Residence) which shares same DLD zone.',
  },
  {
    slug: 'downtown-dubai',
    display_name: 'Downtown Dubai',
    aliases: ['Burj Khalifa area', 'Old Town', 'Opera District', 'The Address'],
    dld_area_names: ['Burj Khalifa'],
    propsearch_slug: 'downtown-dubai',
    area_type: 'master-community',
    developer: 'Emaar',
    display_order: 2,
    notes: 'DLD registers entire Downtown under "Burj Khalifa" area name.',
  },
  {
    slug: 'palm-jumeirah',
    display_name: 'Palm Jumeirah',
    aliases: ['The Palm', 'Palm'],
    dld_area_names: ['Palm Jumeirah'],
    propsearch_slug: 'palm-jumeirah',
    area_type: 'master-community',
    developer: 'Nakheel',
    display_order: 3,
  },
  {
    slug: 'business-bay',
    display_name: 'Business Bay',
    aliases: ['BB'],
    dld_area_names: ['Business Bay'],
    propsearch_slug: 'business-bay',
    area_type: 'district',
    developer: 'Various',
    display_order: 4,
  },
  {
    slug: 'jumeirah-village-circle',
    display_name: 'Jumeirah Village Circle',
    aliases: ['JVC'],
    dld_area_names: ['Al Barsha South Fourth', 'Jumeirah Village Circle'],
    propsearch_slug: 'jumeirah-village-circle',
    area_type: 'master-community',
    developer: 'Nakheel',
    display_order: 5,
    notes: 'Propsearch has districts 10–15 as separate slugs — all map here. DLD uses Al Barsha South Fourth.',
  },
  {
    slug: 'jumeirah-lake-towers',
    display_name: 'Jumeirah Lake Towers',
    aliases: ['JLT', 'JLT Dubai'],
    dld_area_names: ['Al Thanyah Fifth'],
    propsearch_slug: 'jumeirah-lakes-towers',
    area_type: 'master-community',
    developer: 'DMCC',
    display_order: 6,
    notes: 'Al Thanyah Fifth also covers Jumeirah Park. 97k combined transactions.',
  },
  {
    slug: 'jumeirah-park',
    display_name: 'Jumeirah Park',
    aliases: [],
    dld_area_names: ['Al Thanyah Fifth'],
    propsearch_slug: 'jumeirah-park',
    area_type: 'master-community',
    developer: 'Nakheel',
    display_order: 7,
    notes: 'Shares Al Thanyah Fifth DLD zone with JLT. Villas/townhouses only.',
  },
  {
    slug: 'international-city',
    display_name: 'International City',
    aliases: ['IC', 'Dragon Mart area'],
    dld_area_names: ['Al Warsan First', 'International City'],
    propsearch_slug: 'international-city',
    area_type: 'master-community',
    developer: 'Nakheel',
    display_order: 8,
  },
  {
    slug: 'dubai-silicon-oasis',
    display_name: 'Dubai Silicon Oasis',
    aliases: ['DSO', 'Silicon Oasis'],
    dld_area_names: ['Nadd Hessa', 'Dubai Silicon Oasis'],
    propsearch_slug: 'dubai-silicon-oasis',
    area_type: 'master-community',
    developer: 'DSO Authority',
    display_order: 9,
    notes: 'DLD primarily uses "Nadd Hessa". Existing area_name_mapping had wrong "Al Aweer" — corrected here.',
  },
  {
    slug: 'dubai-sports-city',
    display_name: 'Dubai Sports City',
    aliases: ['DSC', 'Sports City'],
    dld_area_names: ['Al Hebiah Fourth'],
    propsearch_slug: 'sports-city',
    area_type: 'master-community',
    developer: 'Dubai Sports City LLC',
    display_order: 10,
    notes: 'DLD uses Al Hebiah Fourth. Includes Canal Residence, Victory Heights, Gallery Villas.',
  },
  {
    slug: 'jumeirah-village-triangle',
    display_name: 'Jumeirah Village Triangle',
    aliases: ['JVT'],
    dld_area_names: ['Al Barsha South Fifth'],
    propsearch_slug: 'jumeirah-village-triangle',
    area_type: 'master-community',
    developer: 'Nakheel',
    display_order: 11,
  },
  {
    slug: 'dubai-creek-harbour',
    display_name: 'Dubai Creek Harbour',
    aliases: ['DCH', 'Creek Harbour', 'The Lagoons'],
    dld_area_names: ['Al Khairan First'],
    propsearch_slug: 'dubai-creek-harbour',
    area_type: 'master-community',
    developer: 'Emaar / Dubai Holding',
    display_order: 12,
    notes: 'Sub-communities: Creek Beach, Creek Island, Creek Marina, The Cove.',
  },
  {
    slug: 'al-furjan',
    display_name: 'Al Furjan',
    aliases: ['Furjan'],
    dld_area_names: ['Jabal Ali First'],
    propsearch_slug: 'al-furjan',
    area_type: 'master-community',
    developer: 'Nakheel',
    display_order: 13,
    notes: 'Jabal Ali First DLD zone also covers Jebel Ali Village and Discovery Gardens.',
  },
  {
    slug: 'discovery-gardens',
    display_name: 'Discovery Gardens',
    aliases: ['DG'],
    dld_area_names: ['Jabal Ali First'],
    propsearch_slug: 'discovery-gardens',
    area_type: 'master-community',
    developer: 'Nakheel',
    display_order: 14,
    notes: 'Shares Jabal Ali First zone with Al Furjan and Jebel Ali Village.',
  },
  {
    slug: 'town-square',
    display_name: 'Town Square',
    aliases: ['Town Square Dubai'],
    dld_area_names: ['Al Yelayiss 2'],
    propsearch_slug: 'town-square',
    area_type: 'master-community',
    developer: 'Nshama',
    display_order: 15,
    notes: 'Al Qudra Road. DLD uses Al Yelayiss 2.',
  },
  {
    slug: 'remraam',
    display_name: 'Remraam',
    aliases: ['Al Ramth', 'Al Thammam'],
    dld_area_names: ['Al Hebiah Fifth'],
    propsearch_slug: 'remraam',
    area_type: 'master-community',
    developer: 'Dubai Properties',
    display_order: 16,
    notes: 'Al Hebiah Fifth. Not to be confused with Mudon (Al Hebiah Sixth).',
  },
  {
    slug: 'motor-city',
    display_name: 'Motor City',
    aliases: ['Uptown Motor City', 'Green Community Motor City'],
    dld_area_names: ['Al Hebiah First'],
    propsearch_slug: 'motor-city',
    area_type: 'master-community',
    developer: 'Union Properties',
    display_order: 17,
    notes: 'DLD Al Hebiah First. Separate from JGE and Production City (Me\'Aisem First).',
  },
  {
    slug: 'dubai-production-city',
    display_name: 'Dubai Production City',
    aliases: ['IMPZ', 'Production City'],
    dld_area_names: ["Me'Aisem First"],
    propsearch_slug: 'dubai-production-city',
    area_type: 'free-zone',
    developer: 'TECOM',
    display_order: 18,
    notes: 'Me\'Aisem First DLD zone. Also covers Jumeirah Golf Estates.',
  },
  {
    slug: 'jumeirah-golf-estates',
    display_name: 'Jumeirah Golf Estates',
    aliases: ['JGE'],
    dld_area_names: ["Me'Aisem First"],
    propsearch_slug: 'jumeirah-golf-estates',
    area_type: 'master-community',
    developer: 'Jumeirah Golf Estates LLC',
    display_order: 19,
    notes: 'Shares Me\'Aisem First with Dubai Production City.',
  },

  // ── Emirates Living ───────────────────────────────────────────────────────────

  {
    slug: 'the-springs',
    display_name: 'The Springs',
    aliases: ['Springs'],
    dld_area_names: ['Al Thanayah Fourth'],
    propsearch_slug: 'the-springs',
    area_type: 'sub-community',
    parent_slug: 'emirates-living',
    developer: 'Emaar',
    display_order: 20,
    notes: 'Al Thanayah Fourth DLD zone. Shares with The Meadows.',
  },
  {
    slug: 'the-meadows',
    display_name: 'The Meadows',
    aliases: ['Meadows'],
    dld_area_names: ['Al Thanayah Fourth'],
    propsearch_slug: 'the-meadows',
    area_type: 'sub-community',
    parent_slug: 'emirates-living',
    developer: 'Emaar',
    display_order: 21,
  },
  {
    slug: 'the-lakes',
    display_name: 'The Lakes',
    aliases: ['Lakes'],
    dld_area_names: ['Al Thanyah Third'],
    propsearch_slug: 'the-lakes',
    area_type: 'sub-community',
    parent_slug: 'emirates-living',
    developer: 'Emaar',
    display_order: 22,
    notes: 'Al Thanyah Third DLD zone. Shares with The Greens and The Views.',
  },
  {
    slug: 'the-greens',
    display_name: 'The Greens',
    aliases: ['Greens'],
    dld_area_names: ['Al Thanyah Third'],
    propsearch_slug: 'the-greens',
    area_type: 'sub-community',
    parent_slug: 'emirates-living',
    developer: 'Emaar',
    display_order: 23,
  },
  {
    slug: 'the-views',
    display_name: 'The Views',
    aliases: ['Views'],
    dld_area_names: ['Al Thanyah Third'],
    propsearch_slug: 'the-views',
    area_type: 'sub-community',
    parent_slug: 'emirates-living',
    developer: 'Emaar',
    display_order: 24,
  },
  {
    slug: 'emirates-living',
    display_name: 'Emirates Living',
    aliases: ['Emirates Hills area'],
    dld_area_names: ['Al Thanyah Third', 'Al Thanayah Fourth', 'Emirates Hills'],
    area_type: 'master-community',
    developer: 'Emaar',
    display_order: 25,
    notes: 'Parent umbrella for The Springs, Meadows, Lakes, Greens, Views, Emirates Hills.',
  },
  {
    slug: 'emirates-hills',
    display_name: 'Emirates Hills',
    aliases: ['The Beverly Hills of Dubai'],
    dld_area_names: ['Emirates Hills', 'Emirates Hills Fourth'],
    propsearch_slug: 'emirates-hills',
    area_type: 'sub-community',
    parent_slug: 'emirates-living',
    developer: 'Emaar',
    display_order: 26,
  },
  {
    slug: 'barsha-heights',
    display_name: 'Barsha Heights',
    aliases: ['TECOM', 'Barsha Heights (TECOM)'],
    dld_area_names: ['Al Thanyah First', 'Barsha Heights'],
    propsearch_slug: 'barsha-heights',
    area_type: 'district',
    developer: 'TECOM',
    display_order: 27,
  },

  // ── MBR City (Mohammed Bin Rashid City) ──────────────────────────────────────

  {
    slug: 'mbr-city',
    display_name: 'Mohammed Bin Rashid City',
    aliases: ['MBR City', 'MBR', 'Mohammed Bin Rashid Al Maktoum City'],
    dld_area_names: ['Hadaeq Sheikh Mohammed Bin Rashid', 'Al Merkadh', 'Nad Al Shiba First', 'Mohammad Bin Rashid City'],
    area_type: 'master-community',
    developer: 'Meydan / Sobha / Emaar',
    display_order: 28,
    notes: 'Umbrella spanning 3+ DLD zones. Selecting MBR City shows all sub-communities.',
  },
  {
    slug: 'dubai-hills-estate',
    display_name: 'Dubai Hills Estate',
    aliases: ['Dubai Hills', 'DHE'],
    dld_area_names: ['Hadaeq Sheikh Mohammed Bin Rashid'],
    propsearch_slug: 'dubai-hills-estate',
    area_type: 'sub-community',
    parent_slug: 'mbr-city',
    developer: 'Emaar',
    display_order: 29,
    notes: 'DLD: Hadaeq Sheikh Mohammed Bin Rashid. Sub-communities: Sidra 1/2/3, Maple, Golf Place, Park Heights.',
  },
  {
    slug: 'sobha-hartland',
    display_name: 'Sobha Hartland',
    aliases: ['Hartland', 'Sobha'],
    dld_area_names: ['Al Merkadh', 'Mohammad Bin Rashid City'],
    propsearch_slug: 'sobha-hartland',
    area_type: 'sub-community',
    parent_slug: 'mbr-city',
    developer: 'Sobha Realty',
    display_order: 30,
  },
  {
    slug: 'district-one',
    display_name: 'District One',
    aliases: ['D1', 'Meydan District One'],
    dld_area_names: ['Al Merkadh'],
    propsearch_slug: 'district-one',
    area_type: 'sub-community',
    parent_slug: 'mbr-city',
    developer: 'Meydan',
    display_order: 31,
  },
  {
    slug: 'meydan-city',
    display_name: 'Meydan City',
    aliases: ['Meydan', 'Azizi Riviera area'],
    dld_area_names: ['Al Merkadh', 'Almeydan', 'Meydan'],
    propsearch_slug: 'meydan',
    area_type: 'sub-community',
    parent_slug: 'mbr-city',
    developer: 'Meydan / Azizi',
    display_order: 32,
    notes: 'DLD uses Al Merkadh and Almeydan interchangeably. Includes Azizi Riviera, Meydan One, Millennium Estates.',
  },

  // ── Arabian Ranches / DubaiLand ───────────────────────────────────────────────

  {
    slug: 'arabian-ranches',
    display_name: 'Arabian Ranches',
    aliases: ['AR', 'AR1', 'Arabian Ranches 1'],
    dld_area_names: ['Wadi Al Safa 6', 'Arabian Ranches'],
    propsearch_slug: 'arabian-ranches',
    area_type: 'master-community',
    developer: 'Emaar',
    display_order: 33,
    notes: 'Original AR1. DLD: Wadi Al Safa 6. Sub-communities: Al Mahra, Al Reem 1-3, Alvorada, Palmera, Saheel, etc.',
  },
  {
    slug: 'arabian-ranches-2',
    display_name: 'Arabian Ranches 2',
    aliases: ['AR2'],
    dld_area_names: ['Wadi Al Safa 7', 'Arabian Ranches 2'],
    propsearch_slug: 'arabian-ranches-2',
    area_type: 'master-community',
    developer: 'Emaar',
    display_order: 34,
    notes: 'DLD: Wadi Al Safa 7. Also contains The Sustainable City, The Acres (Aldar), Layan.',
  },
  {
    slug: 'arabian-ranches-3',
    display_name: 'Arabian Ranches 3',
    aliases: ['AR3'],
    dld_area_names: ['Wadi Al Safa 5', 'Arabian Ranches 3'],
    propsearch_slug: 'arabian-ranches-3',
    area_type: 'master-community',
    developer: 'Emaar',
    display_order: 35,
    notes: 'DLD: Wadi Al Safa 5. Also contains Villanova (Dubai Properties), The Villa, Haven by Aldar, Athlon.',
  },
  {
    slug: 'villanova',
    display_name: 'Villanova',
    aliases: [],
    dld_area_names: ['Wadi Al Safa 5'],
    propsearch_slug: 'villanova',
    area_type: 'sub-community',
    parent_slug: 'arabian-ranches-3',
    developer: 'Dubai Properties',
    display_order: 36,
  },
  {
    slug: 'the-sustainable-city',
    display_name: 'The Sustainable City',
    aliases: ['Sustainable City'],
    dld_area_names: ['Wadi Al Safa 7'],
    propsearch_slug: 'sustainable-city',
    area_type: 'sub-community',
    developer: 'Diamond Developers',
    display_order: 37,
  },
  {
    slug: 'al-barari',
    display_name: 'Al Barari',
    aliases: ['Barari'],
    dld_area_names: ['Wadi Al Safa 3'],
    propsearch_slug: 'al-barari',
    area_type: 'master-community',
    developer: 'Al Barari Group',
    display_order: 38,
    notes: 'Wadi Al Safa 3 also covers Majan, Living Legends, The Fields (MBR City).',
  },
  {
    slug: 'majan',
    display_name: 'Majan',
    aliases: [],
    dld_area_names: ['Wadi Al Safa 3'],
    propsearch_slug: 'majan',
    area_type: 'sub-community',
    developer: 'Dubai Properties',
    display_order: 39,
  },
  {
    slug: 'liwan',
    display_name: 'Liwan',
    aliases: ['Liwan 1'],
    dld_area_names: ['Wadi Al Safa 2'],
    propsearch_slug: 'liwan',
    area_type: 'master-community',
    developer: 'Dubai Properties',
    display_order: 40,
  },
  {
    slug: 'liwan-2',
    display_name: 'Liwan 2',
    aliases: [],
    dld_area_names: ['Wadi Al Safa 2'],
    propsearch_slug: 'liwan-2',
    area_type: 'master-community',
    developer: 'Dubai Properties',
    display_order: 41,
  },

  // ── DAMAC ─────────────────────────────────────────────────────────────────────

  {
    slug: 'damac-hills',
    display_name: 'DAMAC Hills',
    aliases: ['Akoya by DAMAC', 'DAMAC Hills 1'],
    dld_area_names: ['Al Hebiah Third', 'DAMAC Hills (Akoya by DAMAC)'],
    propsearch_slug: 'damac-hills',
    area_type: 'master-community',
    developer: 'DAMAC',
    display_order: 42,
  },
  {
    slug: 'damac-hills-2',
    display_name: 'DAMAC Hills 2',
    aliases: ['Akoya Oxygen', 'Akoya', 'DAMAC Hills 2 (Akoya Oxygen)'],
    dld_area_names: ['Madinat Hind 4', 'DAMAC Hills 2 (Akoya Oxygen)', 'DAMAC Hills 2'],
    propsearch_slug: 'damac-hills-2',
    area_type: 'master-community',
    developer: 'DAMAC',
    display_order: 43,
    notes: 'Rebranded: Akoya Oxygen → Akoya → DAMAC Hills 2 (June 2021).',
  },
  {
    slug: 'mudon',
    display_name: 'Mudon',
    aliases: [],
    dld_area_names: ['Al Hebiah Sixth'],
    propsearch_slug: 'mudon',
    area_type: 'master-community',
    developer: 'Dubai Properties',
    display_order: 44,
  },

  // ── Dubai South / Expo City ────────────────────────────────────────────────────

  {
    slug: 'dubai-south',
    display_name: 'Dubai South',
    aliases: ['Expo City area', 'DWC area', 'Dubai World Central'],
    dld_area_names: ['Madinat Al Mataar'],
    propsearch_slug: 'dubai-south',
    area_type: 'master-community',
    developer: 'Dubai South Properties',
    display_order: 45,
    notes: 'Contains Expo City Dubai, Emaar South, The Pulse, Azizi Venice, South Bay.',
  },
  {
    slug: 'emaar-south',
    display_name: 'Emaar South',
    aliases: [],
    dld_area_names: ['Madinat Al Mataar'],
    propsearch_slug: 'emaar-south',
    area_type: 'sub-community',
    parent_slug: 'dubai-south',
    developer: 'Emaar',
    display_order: 46,
  },

  // ── Free zones & media ─────────────────────────────────────────────────────────

  {
    slug: 'dubai-media-city',
    display_name: 'Dubai Media City',
    aliases: ['DMC', 'Media City'],
    dld_area_names: ['Al Safouh Second', 'Marsa Dubai'],
    propsearch_slug: 'dubai-media-city',
    area_type: 'free-zone',
    developer: 'TECOM',
    display_order: 47,
    notes: 'Some DLD records show under Marsa Dubai. Al Safouh Second is the primary zone.',
  },
  {
    slug: 'dubai-internet-city',
    display_name: 'Dubai Internet City',
    aliases: ['DIC', 'Internet City'],
    dld_area_names: ['Al Safouh First', 'Al Safouh Second'],
    propsearch_slug: 'dubai-internet-city',
    area_type: 'free-zone',
    developer: 'TECOM',
    display_order: 48,
  },

  // ── Traditional districts ──────────────────────────────────────────────────────

  {
    slug: 'jumeirah',
    display_name: 'Jumeirah',
    aliases: ['Jumeirah 1', 'Jumeirah 2', 'Jumeirah 3'],
    dld_area_names: ['Jumeirah', 'Jumeirah First', 'Jumeirah Second', 'Jumeirah Third'],
    propsearch_slug: 'jumeirah',
    area_type: 'district',
    display_order: 49,
  },
  {
    slug: 'al-jaddaf',
    display_name: 'Al Jaddaf',
    aliases: ['Culture Village', 'Jaddaf Waterfront'],
    dld_area_names: ['Al Jadaf', 'Al Jaddaf'],
    propsearch_slug: 'al-jaddaf',
    area_type: 'district',
    display_order: 50,
    notes: 'Also covers Dubai Creek Harbour in some older records — now separate.',
  },
  {
    slug: 'deira',
    display_name: 'Deira',
    aliases: [],
    dld_area_names: ['Deira'],
    propsearch_slug: 'deira',
    area_type: 'district',
    display_order: 51,
  },
  {
    slug: 'bur-dubai',
    display_name: 'Bur Dubai',
    aliases: ['Old Dubai'],
    dld_area_names: ['Bur Dubai'],
    propsearch_slug: 'bur-dubai',
    area_type: 'district',
    display_order: 52,
  },
  {
    slug: 'al-barsha',
    display_name: 'Al Barsha',
    aliases: ['Barsha'],
    dld_area_names: ['Al Barsha', 'Al Barsha First', 'Al Barsha Second', 'Al Barsha Third'],
    propsearch_slug: 'al-barsha',
    area_type: 'district',
    display_order: 53,
  },
  {
    slug: 'al-karama',
    display_name: 'Al Karama',
    aliases: ['Karama'],
    dld_area_names: ['Al Karama'],
    propsearch_slug: 'al-karama',
    area_type: 'district',
    display_order: 54,
  },
  {
    slug: 'mirdif',
    display_name: 'Mirdif',
    aliases: [],
    dld_area_names: ['Mirdif'],
    propsearch_slug: 'mirdif',
    area_type: 'district',
    display_order: 55,
  },
  {
    slug: 'ras-al-khor',
    display_name: 'Ras Al Khor',
    aliases: ['Ras Al Khor Industrial'],
    dld_area_names: ['Ras Al Khor', 'Ras Al Khor Industrial First', 'Ras Al Khor Industrial Second'],
    propsearch_slug: 'ras-al-khor',
    area_type: 'district',
    display_order: 56,
  },
  {
    slug: 'arjan',
    display_name: 'Arjan',
    aliases: ['Arjan Dubai'],
    dld_area_names: ['Arjan'],
    propsearch_slug: 'arjan',
    area_type: 'master-community',
    developer: 'Various',
    display_order: 57,
  },
  {
    slug: 'dubai-islands',
    display_name: 'Dubai Islands',
    aliases: ['Deira Islands'],
    dld_area_names: ['Deira Islands'],
    propsearch_slug: 'dubai-islands',
    area_type: 'master-community',
    developer: 'Nakheel / Dubai Islands',
    display_order: 58,
  },
  {
    slug: 'jumeirah-garden-city',
    display_name: 'Jumeirah Garden City',
    aliases: ['Garden City'],
    dld_area_names: ['Al Satwa', 'Jumeirah Garden City'],
    propsearch_slug: 'jumeirah-garden-city',
    area_type: 'master-community',
    developer: 'Various',
    display_order: 59,
    notes: 'Redevelopment zone on Sheikh Zayed Road / Al Satwa area.',
  },
  {
    slug: 'jebel-ali',
    display_name: 'Jebel Ali',
    aliases: ['Jabal Ali'],
    dld_area_names: ['Jabal Ali', 'Jabal Ali Industrial', 'Jebel Ali'],
    propsearch_slug: 'jebel-ali',
    area_type: 'district',
    display_order: 60,
  },
  {
    slug: 'nad-al-sheba',
    display_name: 'Nad Al Sheba',
    aliases: ['Nad Al Sheba 1', 'Meydan Grandstand area'],
    dld_area_names: ['Nad Al Shiba First', 'Nad Al Shiba', 'Nad Al Sheba'],
    propsearch_slug: 'nad-al-sheba',
    area_type: 'district',
    parent_slug: 'mbr-city',
    developer: 'Meydan',
    display_order: 61,
  },
  {
    slug: 'the-valley',
    display_name: 'The Valley',
    aliases: ['The Valley by Emaar'],
    dld_area_names: ['Al Yufrah 1', 'Al Yufrah 2'],
    propsearch_slug: 'the-valley',
    area_type: 'master-community',
    developer: 'Emaar',
    display_order: 62,
    notes: 'Dubai–Al Ain Road corridor.',
  },
  {
    slug: 'dubailand',
    display_name: 'Dubailand',
    aliases: ['Dubailand Residence Complex'],
    dld_area_names: ['Wadi Al Amardi', 'Al Hebiah Second'],
    propsearch_slug: 'dubailand-residence-complex',
    area_type: 'master-community',
    developer: 'Meraas / Dubai Properties',
    display_order: 63,
    notes: 'Catch-all for misc DubaiLand zones not belonging to a specific master community.',
  },
  {
    slug: 'palm-jebel-ali',
    display_name: 'Palm Jebel Ali',
    aliases: ['Palm Jebel Ali Dubai'],
    dld_area_names: ['Palm Jebel Ali'],
    propsearch_slug: 'palm-jebel-ali',
    area_type: 'master-community',
    developer: 'Nakheel',
    display_order: 64,
    notes: 'Under development. Re-launched 2023.',
  },
  {
    slug: 'tilal-al-ghaf',
    display_name: 'Tilal Al Ghaf',
    aliases: [],
    dld_area_names: ['Al Hebiah Sixth'],
    propsearch_slug: 'tilal-al-ghaf',
    area_type: 'master-community',
    developer: 'Majid Al Futtaim',
    display_order: 65,
    notes: 'Shares Al Hebiah Sixth with Mudon.',
  },
]

// ── Upsert ────────────────────────────────────────────────────────────────────

async function seed() {
  // Insert parent rows first (those with no parent_slug), then children
  const parents = AREAS.filter(a => !a.parent_slug)
  const children = AREAS.filter(a => !!a.parent_slug)

  let upserted = 0
  for (const batch of [parents, children]) {
    for (const a of batch) {
      await sql`
        INSERT INTO nc_areas (
          slug, display_name, aliases, dld_area_names, propsearch_slug,
          area_type, parent_slug, developer, display_order, notes
        ) VALUES (
          ${a.slug},
          ${a.display_name},
          ${a.aliases ?? []},
          ${a.dld_area_names},
          ${a.propsearch_slug ?? null},
          ${a.area_type},
          ${a.parent_slug ?? null},
          ${a.developer ?? null},
          ${a.display_order ?? null},
          ${a.notes ?? null}
        )
        ON CONFLICT (slug) DO UPDATE SET
          display_name    = EXCLUDED.display_name,
          aliases         = EXCLUDED.aliases,
          dld_area_names  = EXCLUDED.dld_area_names,
          propsearch_slug = EXCLUDED.propsearch_slug,
          area_type       = EXCLUDED.area_type,
          parent_slug     = EXCLUDED.parent_slug,
          developer       = EXCLUDED.developer,
          display_order   = EXCLUDED.display_order,
          notes           = EXCLUDED.notes,
          updated_at      = NOW()
      `
      upserted++
      console.log(`  ✓ ${a.slug} (${a.dld_area_names.join(', ')})`)
    }
  }
  console.log(`\n✅ Seeded ${upserted} areas`)
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Creating nc_areas table...')
  await createTable()
  console.log('\nSeeding areas...')
  await seed()

  // Verification
  const [count] = await sql<{ c: string }[]>`SELECT COUNT(*)::text AS c FROM nc_areas`
  const [parents] = await sql<{ c: string }[]>`SELECT COUNT(*)::text AS c FROM nc_areas WHERE parent_slug IS NULL`
  console.log(`\nVerification: ${count.c} total areas, ${parents.c} top-level`)

  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
