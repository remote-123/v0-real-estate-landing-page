import { NextResponse } from 'next/server'

// TEMPORARY DEBUG ENDPOINT — delete after use
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.SANITY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [bayutRes, pfRes] = await Promise.all([
    fetch('https://uae-real-estate2.p.rapidapi.com/properties_search?page=0&langs=en', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'uae-real-estate2.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
      },
      body: JSON.stringify({
        purpose: 'for-rent',
        categories: ['apartments', 'villas', 'penthouses', 'townhouses'],
        index: 'date-desc',
      }),
      cache: 'no-store',
    }),
    fetch('https://propertyfinder-uae-data.p.rapidapi.com/search-rent?location_id=1&sort=newest&page=1', {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'propertyfinder-uae-data.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
      },
      cache: 'no-store',
    }),
  ])

  const bayutData = bayutRes.ok ? await bayutRes.json() : { error: 'Bayut fetch failed' }
  const pfData = pfRes.ok ? await pfRes.json() : { error: 'PF fetch failed' }

  return NextResponse.json({
    bayut: bayutData?.results || [],
    propertyfinder: pfData?.data || [],
  })
}
