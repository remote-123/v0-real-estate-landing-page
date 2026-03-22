import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Fetch Playfair Display Bold (latin subset) from Google Fonts at request time.
async function fetchPlayfairBold(): Promise<ArrayBuffer> {
  const css = await fetch(
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap',
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  ).then((r) => r.text())

  const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/)?.[1]
  if (!url) throw new Error('Could not parse Playfair Display font URL from Google Fonts CSS')
  return fetch(url).then((r) => r.arrayBuffer())
}

// Deterministic hash from string — drives all per-title randomness.
// Same title always produces the same image, so CDN/browser caching stays intact.
function titleHash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i)
  }
  return Math.abs(h)
}

// Extract n values in [0,1] from the hash with different bit offsets
function seeds(h: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => ((h >> (i * 3)) % 1000) / 999)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'Dubai Real Estate Insight'
  const excerpt = searchParams.get('excerpt') || ''

  const fontData = await fetchPlayfairBold()

  // --- Per-title randomisation ---
  const h = titleHash(title)
  const [s0, s1, s2, s3, s4, s5, s6, s7] = seeds(h, 8)

  // Background base: shift between 3 dark palettes
  const bgPalette = [
    '#0c1220', // deep navy (default)
    '#0f1318', // near-black with cool tint
    '#120e1a', // dark indigo
  ]
  const bgColor = bgPalette[h % bgPalette.length]

  // Large warm blob (gold-tinted): top-right quadrant, partially off-canvas
  const blob1Size = Math.round(480 + s0 * 240)       // 480–720px
  const blob1Top  = Math.round(-160 + s1 * 200)      // -160 to 40px
  const blob1Right = Math.round(-120 + s2 * 180)     // -120 to 60px

  // Medium cool blob (blue/teal-tinted): bottom-left quadrant
  const blob2Size  = Math.round(300 + s3 * 200)      // 300–500px
  const blob2Bottom = Math.round(-100 + s4 * 180)    // -100 to 80px
  const blob2Left  = Math.round(-80 + s5 * 200)      // -80 to 120px

  // Diagonal accent shard — a thin rotated rectangle
  const shardAngle  = Math.round(18 + s6 * 30)       // 18–48 deg
  const shardWidth  = Math.round(600 + s7 * 400)     // 600–1000px
  const shardTop    = Math.round(80 + s0 * 280)      // 80–360px
  const shardLeft   = Math.round(200 + s1 * 500)     // 200–700px

  // Gradient overlay direction cycles through a set of angles
  const gradAngles = [125, 145, 160, 110, 135]
  const gradAngle = gradAngles[h % gradAngles.length]

  // Grid line spacing — subtle variation (40, 48, or 56px)
  const GRID = [40, 48, 56][h % 3]

  const horizontalLines: React.ReactNode[] = []
  const verticalLines: React.ReactNode[] = []

  for (let y = GRID; y < 630; y += GRID) {
    horizontalLines.push(
      <div
        key={`h${y}`}
        style={{
          position: 'absolute',
          top: y,
          left: 0,
          width: 1200,
          height: 1,
          backgroundColor: '#c9a96e',
          opacity: 0.055,
        }}
      />
    )
  }

  for (let x = GRID; x < 1200; x += GRID) {
    verticalLines.push(
      <div
        key={`v${x}`}
        style={{
          position: 'absolute',
          top: 0,
          left: x,
          width: 1,
          height: 630,
          backgroundColor: '#c9a96e',
          opacity: 0.055,
        }}
      />
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          width: 1200,
          height: 630,
          backgroundColor: bgColor,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Abstract blob 1: large warm circle (gold-tinted) ── */}
        <div
          style={{
            position: 'absolute',
            top: blob1Top,
            right: blob1Right,
            width: blob1Size,
            height: blob1Size,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,169,110,0.13) 0%, rgba(201,169,110,0.03) 55%, transparent 75%)',
          }}
        />

        {/* ── Abstract blob 2: medium cool circle (blue-tinted) ── */}
        <div
          style={{
            position: 'absolute',
            bottom: blob2Bottom,
            left: blob2Left,
            width: blob2Size,
            height: blob2Size,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(58,100,180,0.14) 0%, rgba(58,100,180,0.04) 55%, transparent 75%)',
          }}
        />

        {/* ── Diagonal shard ── */}
        <div
          style={{
            position: 'absolute',
            top: shardTop,
            left: shardLeft,
            width: shardWidth,
            height: 1,
            backgroundColor: '#c9a96e',
            opacity: 0.1,
            transform: `rotate(${shardAngle}deg)`,
            transformOrigin: '0 0',
          }}
        />
        {/* Second shard slightly offset */}
        <div
          style={{
            position: 'absolute',
            top: shardTop + 12,
            left: shardLeft - 40,
            width: Math.round(shardWidth * 0.6),
            height: 1,
            backgroundColor: '#c9a96e',
            opacity: 0.06,
            transform: `rotate(${shardAngle}deg)`,
            transformOrigin: '0 0',
          }}
        />

        {/* ── Grid pattern ── */}
        {horizontalLines}
        {verticalLines}

        {/* ── Directional depth gradient ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            background: `linear-gradient(${gradAngle}deg, rgba(12,18,32,0.0) 0%, rgba(12,18,32,0.65) 100%)`,
          }}
        />

        {/* ── Left gold accent bar ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 4,
            height: 630,
            backgroundColor: '#c9a96e',
          }}
        />

        {/* ── Main content ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '56px 72px 52px 72px',
          }}
        >
          {/* Top label */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <div
              style={{
                fontSize: 11,
                fontFamily: 'sans-serif',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#c9a96e',
                opacity: 0.75,
              }}
            >
              Market Intelligence
            </div>
            <div
              style={{
                marginLeft: 16,
                width: 40,
                height: 1,
                backgroundColor: '#c9a96e',
                opacity: 0.35,
              }}
            />
          </div>

          {/* Title block — fixed height clips overflow */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 960,
              height: 260,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontFamily: 'Playfair Display',
                fontWeight: 700,
                fontSize: 64,
                lineHeight: 1.15,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </div>
          </div>

          {/* Excerpt (optional) */}
          {excerpt ? (
            <div
              style={{
                display: 'flex',
                height: 48,
                overflow: 'hidden',
                maxWidth: 860,
                marginTop: -24,
              }}
            >
              <div
                style={{
                  fontFamily: 'sans-serif',
                  fontSize: 20,
                  lineHeight: 1.5,
                  color: '#8b9ab5',
                  fontWeight: 400,
                }}
              >
                {excerpt}
              </div>
            </div>
          ) : null}

          {/* Bottom row: brand left, domain right */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: '#c9a96e',
                  marginRight: 10,
                }}
              />
              <div
                style={{
                  fontFamily: 'sans-serif',
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#c9a96e',
                }}
              >
                North Capital DXB
              </div>
            </div>

            <div
              style={{
                fontFamily: 'sans-serif',
                fontSize: 13,
                letterSpacing: '0.06em',
                color: '#8b9ab5',
                opacity: 0.7,
              }}
            >
              northcapitaldxb.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Playfair Display',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    }
  )
}
