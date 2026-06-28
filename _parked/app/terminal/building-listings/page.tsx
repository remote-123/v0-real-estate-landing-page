import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import { unstable_cache } from 'next/cache'
import { terminalPageMeta } from '@/lib/terminal-metadata'
import { BuildingListingsClient } from '@/components/terminal/building-listings-client'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return terminalPageMeta({
    title: 'Building Listings',
    description: 'Search active rental listings and recent DLD sale transactions for any Dubai building — with live yield and capital appreciation analysis.',
    path: '/terminal/building-listings',
  })
}

const SQM_TO_SQFT = 10.7639

export function normalizeBedrooms(val: string | null | undefined): string {
  if (!val) return 'unknown'
  const v = val.toLowerCase().trim()
  if (v === 'studio' || v === '0') return 'Studio'
  if (v === '1' || v === '1 b/r') return '1BR'
  if (v === '2' || v === '2 b/r') return '2BR'
  if (v === '3' || v === '3 b/r') return '3BR'
  if (v === '4' || v === '4 b/r') return '4BR'
  if (/^[56789]|penthouse/i.test(v) || v.includes('5 b')) return '5BR+'
  return val
}

export type SaleTx = {
  building_name_en: string
  bedrooms: string
  sqft: number
  price: number
  psm: number
  date: string
}

export type RentalListing = {
  id: string
  cluster: string
  bedrooms: string
  sqft: number
  annual_price: number
  monthly_price: number
  url: string
}

export type PreBoomLow = {
  price: number
  date: string
  bedrooms: string
  sqft: number
} | null

const fetchBuildingData = unstable_cache(
  async (building: string): Promise<{
    sales: SaleTx[]
    rentals: RentalListing[]
    preBoomLow: PreBoomLow
  }> => {
  const like = '%' + building + '%'
  const [salesRaw, rentalsRaw, preBoomRaw] = await Promise.all([
    sql`
      SELECT building_name_en, rooms_en, procedure_area, actual_worth, instance_date, meter_sale_price
      FROM dld_transactions
      WHERE building_name_en ILIKE ${like}
        AND trans_group_en = 'Sales'
        AND actual_worth > 0
        AND instance_date >= NOW() - INTERVAL '3 years'
      ORDER BY instance_date DESC
      LIMIT 500
    `,
    sql`
      SELECT id, cluster, bedrooms, size_sqft, annual_price, monthly_price, external_url
      FROM rental_listings
      WHERE cluster ILIKE ${like}
      ORDER BY annual_price ASC
      LIMIT 200
    `,
    sql`
      SELECT actual_worth, instance_date, rooms_en, procedure_area
      FROM dld_transactions
      WHERE building_name_en ILIKE ${like}
        AND trans_group_en = 'Sales'
        AND actual_worth > 0
        AND instance_date < '2022-01-01'
      ORDER BY actual_worth ASC
      LIMIT 1
    `,
  ])

  const sales: SaleTx[] = salesRaw.map(r => ({
    building_name_en: r.building_name_en as string,
    bedrooms: normalizeBedrooms(r.rooms_en as string),
    sqft: Math.round(Number(r.procedure_area) * SQM_TO_SQFT),
    price: Number(r.actual_worth),
    psm: Number(r.meter_sale_price),
    date: new Date(r.instance_date as string).toISOString().slice(0, 10),
  }))

  const rentals: RentalListing[] = rentalsRaw.map(r => ({
    id: r.id as string,
    cluster: r.cluster as string,
    bedrooms: normalizeBedrooms(r.bedrooms as string),
    sqft: Number(r.size_sqft),
    annual_price: Number(r.annual_price),
    monthly_price: Number(r.monthly_price),
    url: r.external_url as string,
  }))

  const pb = preBoomRaw[0]
  const preBoomLow: PreBoomLow = pb ? {
    price: Number(pb.actual_worth),
    date: new Date(pb.instance_date as string).toISOString().slice(0, 10),
    bedrooms: normalizeBedrooms(pb.rooms_en as string),
    sqft: Math.round(Number(pb.procedure_area) * SQM_TO_SQFT),
  } : null

  return { sales, rentals, preBoomLow }
  },
  ['building-listings-data'],
  { revalidate: 3600 }
)

export default async function BuildingListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ building?: string }>
}) {
  const { building } = await searchParams

  let data = { sales: [] as SaleTx[], rentals: [] as RentalListing[], preBoomLow: null as PreBoomLow }
  if (building?.trim()) {
    try { data = await fetchBuildingData(building.trim()) } catch { /* noop */ }
  }

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 max-w-7xl mx-auto pb-24 lg:pb-12">
      <BuildingListingsClient
        building={building ?? null}
        initialSales={data.sales}
        initialRentals={data.rentals}
        preBoomLow={data.preBoomLow}
      />
    </div>
  )
}
