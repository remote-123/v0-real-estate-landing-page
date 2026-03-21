export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.northcapitaldxb.com'}/api/distress-video`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.CRON_SECRET }),
    }
  );

  const data = await res.json();
  return Response.json(data);
}
