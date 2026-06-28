export type Community = {
  slug: string
  name: string
  area: string
  type: 'mixed' | 'apartments' | 'villas'
  isFreehold: boolean
  avgPricePerSqft: number
  medianPrice: number
  totalUnits: number
  apartments: number
  villas: number
  grossYield: number
  transactions30d: number
  upcomingSupply: number
  momChange: number // %
  avgDaysOnMarket: number
  priceHistory?: number[]
  priceMomPct: number
  volMomPct: number
  momentumScore: number
}
