export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.northcapitaldxb.com'}/api/ai-linkedin-post-generator`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'NORTHCAPITAL_SUPER_SECRET_KEY_2026' }),
    }
  );

  const data = await res.json();
  return Response.json(data);
}
