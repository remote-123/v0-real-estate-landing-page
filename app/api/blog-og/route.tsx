import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'Dubai Real Estate Insight'
  const excerpt = searchParams.get('excerpt') || ''

  // Grid line spacing in px
  const GRID = 48

  // Build a set of horizontal and vertical grid lines as thin divs.
  // Satori supports absolute positioning inside a relative container.
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
          opacity: 0.06,
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
          opacity: 0.06,
        }}
      />
    )
  }

  return new ImageResponse(
    (
      // Root canvas
      <div
        style={{
          position: 'relative',
          width: 1200,
          height: 630,
          backgroundColor: '#0c1220',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* --- Grid pattern layer --- */}
        {horizontalLines}
        {verticalLines}

        {/* --- Diagonal depth gradient overlay (bottom-right to transparent) --- */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 700,
            height: 420,
            background: 'linear-gradient(135deg, transparent 0%, #1a2540 100%)',
            opacity: 0.55,
          }}
        />

        {/* --- Left gold accent bar --- */}
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

        {/* --- Main content column --- */}
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
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
            {/* short rule after label */}
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

          {/* Middle: title block */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 960,
              // Fixed height to cap visible text (~3 lines at ~72px line-height)
              height: 260,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontFamily: 'serif',
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

          {/* Excerpt (optional) — below title, muted */}
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
            {/* Brand */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {/* Small gold square mark */}
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

            {/* Domain */}
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
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    }
  )
}
