import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Design Preview — Admin',
  robots: { index: false, follow: false },
}

export default function DesignPreviewPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-bold text-foreground">Brand Design Concepts</h1>
        <p className="text-sm text-muted-foreground mt-1">2 directions each for City Registry and North Capital DXB.</p>
      </div>

      {/* ── CITY REGISTRY ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
          The City Registry — 2 Concepts
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* CR Concept A — Bloomberg Terminal */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">A · Bloomberg Terminal</p>
            <p className="text-[11px] text-muted-foreground">Dense, data-heavy, monospace. Dark navy. Feels like a professional trading desk.</p>
            <div className="rounded-xl overflow-hidden border border-[#1a2744] shadow-lg" style={{ background: '#060d1f' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a2744]" style={{ background: '#0a1628' }}>
                <span className="font-mono text-sm font-bold tracking-widest" style={{ color: '#f59e0b' }}>CITYREGISTRY</span>
                <div className="flex gap-3 font-mono text-[10px]" style={{ color: '#4a7ab5' }}>
                  <span>TERMINAL</span><span>DATA</span><span>ALERTS</span>
                </div>
              </div>
              {/* Ticker bar */}
              <div className="flex gap-4 px-4 py-1.5 font-mono text-[10px] border-b border-[#1a2744]" style={{ background: '#0d1f3c', color: '#6b9bd2' }}>
                <span style={{ color: '#4ade80' }}>JVC ▲2.3%</span>
                <span style={{ color: '#f87171' }}>JBR ▼1.1%</span>
                <span style={{ color: '#4ade80' }}>DH ▲4.7%</span>
                <span style={{ color: '#facc15' }}>MBR ◆0.2%</span>
              </div>
              {/* Content */}
              <div className="p-4 grid grid-cols-3 gap-3">
                {[['TXN VOL', '1.66M', '#6b9bd2'], ['AVG PSF', '1,247', '#4ade80'], ['DISTRESS', '847', '#f87171']].map(([l, v, c]) => (
                  <div key={l} className="rounded border p-2.5" style={{ borderColor: '#1a2744', background: '#0a1628' }}>
                    <p className="font-mono text-[9px] mb-1" style={{ color: '#4a7ab5' }}>{l}</p>
                    <p className="font-mono text-lg font-bold" style={{ color: c as string }}>{v}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 pb-4">
                <div className="rounded border p-3 font-mono text-[10px]" style={{ borderColor: '#1a2744', background: '#0a1628', color: '#4a7ab5' }}>
                  <div className="flex justify-between mb-2" style={{ color: '#f59e0b' }}>
                    <span>TRANSACTION PULSE — MAR 2026</span><span>DLD SOURCE</span>
                  </div>
                  <div className="space-y-1">
                    {[['DUBAI MARINA', '2,847', '+12.3%'], ['JVC', '1,923', '+8.1%'], ['BUSINESS BAY', '1,641', '-2.4%']].map(([a, v, d]) => (
                      <div key={a} className="flex justify-between">
                        <span>{a}</span><span>{v}</span>
                        <span style={{ color: d.startsWith('+') ? '#4ade80' : '#f87171' }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {['Dark navy #060d1f', 'Amber accent #f59e0b', 'Mono font', 'Dense tables', 'Ticker bar'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* CR Concept B — Clean Analytics */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">B · Clean Analytics</p>
            <p className="text-[11px] text-muted-foreground">Modern SaaS data platform. Light gray, blue accent, generous whitespace. Looker / Metabase feel.</p>
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg" style={{ background: '#f8fafc' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200" style={{ background: '#ffffff' }}>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded" style={{ background: '#2563eb' }} />
                  <span className="text-sm font-bold tracking-tight text-gray-900">The City Registry</span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Terminal</span><span>Datasets</span><span>API</span>
                </div>
              </div>
              {/* Content */}
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[['Transactions', '1.66M', '+12%'], ['Avg PSF', 'AED 1,247', '+4%'], ['Distress', '847 deals', '-8%']].map(([l, v, d]) => (
                    <div key={l} className="rounded-lg border border-gray-200 p-3 bg-white">
                      <p className="text-[10px] text-gray-400 mb-1">{l}</p>
                      <p className="text-base font-bold text-gray-900">{v}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: d.startsWith('+') ? '#16a34a' : '#dc2626' }}>{d} vs last month</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-900">Community Screener</p>
                    <span className="text-[10px] rounded-full px-2 py-0.5 font-medium" style={{ background: '#eff6ff', color: '#2563eb' }}>Live data</span>
                  </div>
                  <div className="space-y-2">
                    {[['Dubai Marina', '8.2%', 'AED 1,890'], ['JVC', '7.1%', 'AED 980'], ['Business Bay', '6.8%', 'AED 1,420']].map(([a, y, p]) => (
                      <div key={a} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">{a}</span>
                        <span className="font-medium" style={{ color: '#2563eb' }}>{y} yield</span>
                        <span className="text-gray-400">{p}/sqft</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {['Light #f8fafc', 'Blue accent #2563eb', 'Sans-serif', 'Card layout', 'Generous whitespace'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── NORTH CAPITAL ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
          North Capital DXB — 2 Concepts
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* NC Concept A — Boutique Advisory */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">A · Boutique Advisory</p>
            <p className="text-[11px] text-muted-foreground">Warm, personal, high-trust. Cream background, gold accent, serif typography. Family office feel.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{ background: '#faf7f2', borderColor: '#e8ddd0' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: '#faf7f2', borderColor: '#e8ddd0' }}>
                <span className="font-serif text-lg font-bold" style={{ color: '#1a1208', letterSpacing: '-0.02em' }}>North Capital</span>
                <div className="flex gap-5 text-xs" style={{ color: '#8b7355' }}>
                  <span>Services</span><span>Projects</span><span>Blog</span><span>Contact</span>
                </div>
              </div>
              {/* Hero */}
              <div className="px-6 py-8 text-center space-y-3">
                <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#b8935a' }}>Dubai · Real Estate Advisory</p>
                <h2 className="font-serif text-2xl font-bold leading-tight" style={{ color: '#1a1208' }}>
                  Your capital,<br />engineered for growth.
                </h2>
                <p className="text-xs leading-relaxed max-w-xs mx-auto" style={{ color: '#6b5a42' }}>
                  Boutique advisory for global investors seeking 7%+ net yields, tax-free, in Dubai's freehold market.
                </p>
                <button className="mt-2 rounded px-5 py-2 text-xs font-semibold" style={{ background: '#b8935a', color: '#faf7f2' }}>
                  Book a Strategy Call
                </button>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-3 divide-x border-t text-center py-4" style={{ borderColor: '#e8ddd0', divideColor: '#e8ddd0', background: '#f5efe6' }}>
                {[['AED 120M+', 'Deployed'], ['7.4%', 'Avg Net Yield'], ['340+', 'Clients']].map(([v, l]) => (
                  <div key={l} className="px-3">
                    <p className="font-serif font-bold" style={{ color: '#b8935a' }}>{v}</p>
                    <p className="text-[10px]" style={{ color: '#8b7355' }}>{l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {['Cream #faf7f2', 'Gold accent #b8935a', 'Serif font', 'Warm tones', 'Advisory CTAs'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* NC Concept B — Luxury Dark */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">B · Luxury Dark</p>
            <p className="text-[11px] text-muted-foreground">Editorial, premium dark. Charcoal background, amber/champagne accent, bold serif headlines. Knight Frank / Savills feel.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{ background: '#111111', borderColor: '#2a2a2a' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
                <span className="font-serif text-lg font-bold" style={{ color: '#f5e6c8', letterSpacing: '0.05em' }}>NORTH CAPITAL</span>
                <div className="flex gap-5 text-[11px]" style={{ color: '#6b6b6b' }}>
                  <span>Services</span><span>Projects</span><span>Blog</span>
                </div>
              </div>
              {/* Hero */}
              <div className="px-6 py-8 space-y-4">
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: '#c9a96e' }}>Institutional Grade · Dubai</p>
                <h2 className="font-serif text-2xl font-bold leading-tight" style={{ color: '#f5e6c8' }}>
                  Where global capital<br />finds its yield.
                </h2>
                <p className="text-xs leading-relaxed" style={{ color: '#888888' }}>
                  Vetted off-plan and secondary market opportunities. 0% tax jurisdiction. 7%+ net returns.
                </p>
                <div className="flex gap-3">
                  <button className="rounded px-4 py-2 text-xs font-semibold" style={{ background: '#c9a96e', color: '#111111' }}>
                    View Projects
                  </button>
                  <button className="rounded border px-4 py-2 text-xs font-semibold" style={{ borderColor: '#3a3a3a', color: '#888888' }}>
                    Book Consultation
                  </button>
                </div>
              </div>
              {/* Featured project pill */}
              <div className="mx-6 mb-6 rounded-lg border p-3 flex items-center justify-between" style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}>
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#c9a96e' }}>Featured Project</p>
                  <p className="text-sm font-semibold" style={{ color: '#f5e6c8' }}>Sobha Hartland II</p>
                  <p className="text-[10px]" style={{ color: '#666' }}>From AED 1.2M · Q4 2026</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold font-mono" style={{ color: '#c9a96e' }}>8.1%</p>
                  <p className="text-[10px]" style={{ color: '#555' }}>Projected Yield</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {['Charcoal #111111', 'Champagne #c9a96e', 'Serif font', 'Editorial layout', 'Project showcase'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-lg border border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground">
        These are inline mockups showing the design direction. Pick one for each brand and I'll implement it across all pages.
      </div>
    </div>
  )
}
