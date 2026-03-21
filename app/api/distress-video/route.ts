import { NextResponse } from 'next/server';
import { sendTelegram, sendTelegramError } from '@/lib/telegram';

export const maxDuration = 120;

const SHOTSTACK_API_KEY = process.env.SHOTSTACK_API_KEY!;
const SHOTSTACK_BASE = 'https://api.shotstack.io/v1';

// ─── PropertyFinder fetch (same source as distress-xpost) ───────────────────

async function fetchTopDistressDeal() {
  const url =
    'https://propertyfinder-uae-data.p.rapidapi.com/search-buy?location_id=1&sort=newest&page=1&is_new_construction=false';

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'propertyfinder-uae-data.p.rapidapi.com',
      'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
    },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Failed to fetch PropertyFinder data');

  const data = await res.json();
  const rawData = Array.isArray(data?.data) ? data.data : [];

  const deals = rawData
    .filter((item: any) => item?.property_id && (item.price?.value || 0) > 0)
    .filter((item: any) => !item.is_direct_from_developer)
    .filter((item: any) => Array.isArray(item.images) && item.images.length > 0)
    .map((item: any) => {
      const currentPrice = item.price?.value || 0;
      const sizeSqft = Math.round(item.size?.value || 0);
      const pricePerSqft = sizeSqft > 0 ? Math.round(currentPrice / sizeSqft) : 0;
      const createdDate = new Date(item.listed_date || Date.now());
      const daysOnMarket = Math.max(
        1,
        Math.floor((Date.now() - createdDate.getTime()) / (1000 * 3600 * 24))
      );

      return {
        id: item.property_id.toString(),
        title: item.title || '',
        location: item.address?.full_name || 'Dubai',
        bedrooms: item.bedrooms?.toString() || 'Studio',
        sizeSqft,
        pricePerSqft,
        currentPrice,
        daysOnMarket,
        externalUrl: item.property_url || '',
        imageUrl: item.images[0] || '',
      };
    })
    .sort((a: any, b: any) => b.daysOnMarket - a.daysOnMarket);

  return deals[0] || null;
}

// ─── HTML overlay (9:16, 1080×1920) ─────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtmlOverlay(deal: any): string {
  const title = escapeHtml(
    deal.title.length > 52 ? deal.title.slice(0, 49) + '...' : deal.title
  );
  const location = escapeHtml(deal.location);
  const price = `AED ${deal.currentPrice.toLocaleString()}`;
  const details = [
    deal.sizeSqft > 0 ? `${deal.sizeSqft.toLocaleString()} sqft` : '',
    deal.pricePerSqft > 0 ? `AED ${deal.pricePerSqft.toLocaleString()}/sqft` : '',
    `${deal.daysOnMarket}d on market`,
  ]
    .filter(Boolean)
    .join('&nbsp;&nbsp;|&nbsp;&nbsp;');

  return `<!DOCTYPE html>
<html>
<head><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; }
body {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  width: 1080px;
  height: 1920px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 80px 72px;
  background: linear-gradient(
    to top,
    rgba(0,0,0,0.94) 0%,
    rgba(0,0,0,0.6) 40%,
    transparent 68%
  );
  color: white;
}
.badge {
  display: inline-block;
  background: #ef4444;
  color: white;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 5px;
  text-transform: uppercase;
  padding: 10px 22px;
  border-radius: 4px;
  margin-bottom: 28px;
  width: fit-content;
}
.title {
  font-size: 58px;
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 18px;
  letter-spacing: -1px;
}
.location {
  font-size: 32px;
  color: rgba(255,255,255,0.72);
  margin-bottom: 32px;
}
.price {
  font-size: 80px;
  font-weight: 900;
  color: #10b981;
  margin-bottom: 12px;
  letter-spacing: -2px;
}
.detail {
  font-size: 26px;
  color: rgba(255,255,255,0.52);
  margin-bottom: 52px;
}
.cta {
  font-size: 22px;
  color: rgba(255,255,255,0.40);
  letter-spacing: 3px;
  text-transform: uppercase;
  border-top: 1px solid rgba(255,255,255,0.12);
  padding-top: 24px;
}
</style></head>
<body>
  <div class="badge">Distress Deal</div>
  <div class="title">${title}</div>
  <div class="location">&#128205; ${location}</div>
  <div class="price">${price}</div>
  <div class="detail">${details}</div>
  <div class="cta">northcapitaldxb.com/terminal</div>
</body>
</html>`;
}

// ─── Shotstack render ────────────────────────────────────────────────────────

async function submitShotstackRender(deal: any): Promise<string> {
  const html = buildHtmlOverlay(deal);

  const payload = {
    timeline: {
      background: '#000000',
      tracks: [
        {
          clips: [
            {
              asset: { type: 'image', src: deal.imageUrl },
              start: 0,
              length: 15,
              effect: 'zoomIn',
              filter: 'dark',
              fit: 'cover',
              position: 'center',
            },
          ],
        },
        {
          clips: [
            {
              asset: {
                type: 'html',
                html,
                width: 1080,
                height: 1920,
              },
              start: 0.5,
              length: 14.5,
              position: 'center',
              transition: { in: 'fadeIn' },
            },
          ],
        },
      ],
    },
    output: {
      format: 'mp4',
      resolution: '1080',
      aspectRatio: '9:16',
      fps: 25,
    },
  };

  const res = await fetch(`${SHOTSTACK_BASE}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': SHOTSTACK_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Shotstack submit failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.response.id as string;
}

async function pollRender(renderId: string, maxWaitMs = 90_000): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 5000));

    const res = await fetch(`${SHOTSTACK_BASE}/render/${renderId}`, {
      headers: { 'x-api-key': SHOTSTACK_API_KEY },
    });

    if (!res.ok) throw new Error(`Shotstack poll failed (${res.status})`);

    const data = await res.json();
    const { status, url, error } = data.response;

    if (status === 'done') return url as string;
    if (status === 'failed') throw new Error(`Shotstack render failed: ${error}`);
  }

  throw new Error('Shotstack render timed out after 90s');
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deal = await fetchTopDistressDeal().catch((err) => {
      throw new Error(`PropertyFinder fetch failed: ${err.message}`);
    });

    if (!deal) {
      return NextResponse.json(
        { error: 'No deals with images found' },
        { status: 404 }
      );
    }

    const renderId = await submitShotstackRender(deal).catch(async (err) => {
      await sendTelegramError('/api/distress-video', 'shotstack_submit', err, {
        dealId: deal.id,
      });
      throw err;
    });

    const videoUrl = await pollRender(renderId).catch(async (err) => {
      await sendTelegramError('/api/distress-video', 'shotstack_poll', err, {
        renderId,
      });
      throw err;
    });

    await sendTelegram(
      `🎬 <b>DISTRESS DEAL SHORT READY</b>\n\n` +
        `<b>${escapeHtml(deal.title)}</b>\n` +
        `📍 ${escapeHtml(deal.location)}\n` +
        `💰 AED ${deal.currentPrice.toLocaleString()}` +
        (deal.pricePerSqft > 0
          ? ` (AED ${deal.pricePerSqft.toLocaleString()}/sqft)`
          : '') +
        `\n⏳ ${deal.daysOnMarket}d on market\n\n` +
        `🎥 <a href="${videoUrl}">Download MP4</a>\n` +
        (deal.externalUrl ? `🔗 <a href="${deal.externalUrl}">PropertyFinder listing</a>` : '')
    );

    return NextResponse.json({ success: true, videoUrl, renderId, dealId: deal.id });
  } catch (error: any) {
    console.error('❌ Distress Video Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
