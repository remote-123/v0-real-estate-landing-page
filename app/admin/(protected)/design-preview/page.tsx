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

      {/* ── CITY REGISTRY — 5 NEW CONCEPTS ─────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
          The City Registry — 5 New Concepts (researched from CoStar, Bloomberg, MSCI, Hex, FactSet)
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* C1 — Registry Dark */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">C1 · Registry Dark</p>
            <p className="text-[11px] text-muted-foreground">Bloomberg meets Dubai. Near-black with emerald green data signals + amber highlights. IBM Plex Mono.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{ background: '#0A0A0F', borderColor: '#1a1a2e' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1a1a2e', background: '#111118' }}>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#00C47A' }} />
                  <span className="font-mono text-xs font-bold tracking-widest" style={{ color: '#00C47A' }}>CITY REGISTRY</span>
                </div>
                <div className="flex gap-3 font-mono text-[10px]" style={{ color: '#333355' }}>
                  <span style={{ color: '#00C47A' }}>TERMINAL</span><span>DATA</span><span>ALERTS</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[['TXN VOLUME', '1.66M', '#00C47A'], ['AVG PSF', 'AED 1,247', '#F0B429'], ['DISTRESS', '847', '#ff4444']].map(([l, v, c]) => (
                    <div key={l} className="rounded border p-2" style={{ borderColor: '#1a1a2e', background: '#111118' }}>
                      <p className="font-mono text-[9px] mb-1.5" style={{ color: '#333355' }}>{l}</p>
                      <p className="font-mono text-base font-bold" style={{ color: c as string }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded border p-3 font-mono text-[10px]" style={{ borderColor: '#1a1a2e', background: '#111118' }}>
                  <div className="flex justify-between mb-2" style={{ color: '#F0B429' }}>
                    <span>TOP AREAS BY MOMENTUM</span><span>LIVE</span>
                  </div>
                  {[['DUBAI MARINA', '+12.3%', true], ['JVC', '+8.1%', true], ['DOWNTOWN', '-2.4%', false]].map(([a, d, up]) => (
                    <div key={a as string} className="flex justify-between py-0.5 border-t" style={{ borderColor: '#1a1a2e' }}>
                      <span style={{ color: '#666688' }}>{a}</span>
                      <span style={{ color: up ? '#00C47A' : '#ff4444' }}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['#0A0A0F bg', '#00C47A green', '#F0B429 amber', 'IBM Plex Mono', 'Dense tables'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* C2 — Capital Navy */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">C2 · Capital Navy</p>
            <p className="text-[11px] text-muted-foreground">MSCI/FactSet institutional. Deep navy, gold accents, teal charts. Feels like a GCC fund's internal dashboard.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{ background: '#0D1B2A', borderColor: '#1c3050' }}>
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: '#1c3050', background: '#162640' }}>
                <span className="text-sm font-bold tracking-wide" style={{ color: '#C9A84C', fontFamily: 'serif' }}>The City Registry</span>
                <div className="flex gap-4 text-[11px]" style={{ color: '#4a6fa5' }}>
                  <span>Terminal</span><span>Research</span><span>API</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[['Transactions YTD', '142,847', '+18.3%'], ['Distress Index', '4.2 / 10', '+0.3']].map(([l, v, d]) => (
                    <div key={l} className="rounded border p-3" style={{ borderColor: '#1c3050', background: '#162640' }}>
                      <p className="text-[10px] mb-1" style={{ color: '#4a6fa5' }}>{l}</p>
                      <p className="text-lg font-bold" style={{ color: '#e8d5a3' }}>{v}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: '#4FC3C3' }}>{d} vs last qtr</p>
                    </div>
                  ))}
                </div>
                <div className="rounded border p-3" style={{ borderColor: '#1c3050', background: '#162640' }}>
                  <p className="text-[10px] mb-2" style={{ color: '#C9A84C' }}>YIELD MAP — Q1 2026</p>
                  <div className="space-y-1.5">
                    {[['Business Bay', '7.8%', 85], ['Dubai Marina', '6.9%', 75], ['JVC', '8.2%', 90]].map(([a, y, w]) => (
                      <div key={a} className="space-y-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span style={{ color: '#7a9cc4' }}>{a}</span>
                          <span style={{ color: '#4FC3C3' }}>{y}</span>
                        </div>
                        <div className="h-1 rounded-full" style={{ background: '#1c3050' }}>
                          <div className="h-1 rounded-full" style={{ background: '#4FC3C3', width: `${w}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['#0D1B2A navy', '#C9A84C gold', '#4FC3C3 teal', 'Inter + DM Mono', 'Yield bars'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* C3 — Sand & Steel */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">C3 · Sand & Steel</p>
            <p className="text-[11px] text-muted-foreground">Dubai geography-coded. Desert sand warm whites, slate blue precision. Regional identity without consumer clichés. Editorial feel.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{ background: '#F5F0E8', borderColor: '#ddd5c5' }}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: '#ddd5c5', background: '#FFFFFF' }}>
                <div>
                  <span className="text-sm font-bold" style={{ color: '#1C3A5E', fontFamily: 'serif', letterSpacing: '-0.02em' }}>The City Registry</span>
                  <span className="ml-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: '#B8860B' }}>Dubai</span>
                </div>
                <div className="flex gap-4 text-xs" style={{ color: '#8a9db5' }}>
                  <span>Data</span><span>Terminal</span><span>Research</span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#B8860B' }}>Market Snapshot · May 2026</p>
                  <h3 className="text-lg font-bold leading-tight" style={{ color: '#1C3A5E', fontFamily: 'serif' }}>
                    Transaction volumes up 18%<br />quarter-on-quarter
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[['Deals', '4,284', '#1C3A5E'], ['Avg PSF', '1,247', '#1C3A5E'], ['Yield', '7.4%', '#B8860B']].map(([l, v, c]) => (
                    <div key={l} className="rounded border p-3 text-center" style={{ borderColor: '#ddd5c5', background: '#FFFFFF' }}>
                      <p className="text-[10px] mb-1" style={{ color: '#8a9db5' }}>{l}</p>
                      <p className="text-base font-bold" style={{ color: c as string }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded border p-3" style={{ borderColor: '#ddd5c5', background: '#FFFFFF' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1 flex-1 rounded" style={{ background: '#1C3A5E' }} />
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: '#8a9db5' }}>Top Communities</p>
                    <div className="h-1 flex-1 rounded" style={{ background: '#1C3A5E' }} />
                  </div>
                  {[['Dubai Marina', 'AED 1,890/sqft'], ['JVC', 'AED 980/sqft'], ['Business Bay', 'AED 1,420/sqft']].map(([a, p]) => (
                    <div key={a} className="flex justify-between py-1.5 border-b text-xs last:border-0" style={{ borderColor: '#f0e8dc' }}>
                      <span style={{ color: '#1C3A5E' }}>{a}</span>
                      <span style={{ color: '#B8860B' }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['#F5F0E8 sand', '#1C3A5E slate', '#B8860B gold', 'Serif headings', 'Editorial layout'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* C4 — Intelligence Layer */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">C4 · Intelligence Layer</p>
            <p className="text-[11px] text-muted-foreground">Hex/Vercel design language meets institutional data. Slate-900, sky blue + violet. Modern analyst/quant aesthetic.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{ background: '#0F172A', borderColor: '#1e293b' }}>
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: '#1e293b', background: '#0F172A' }}>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38BDF8, #A78BFA)' }}>
                    <span className="text-[8px] font-bold text-white">CR</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>City Registry</span>
                </div>
                <div className="flex gap-3 text-[11px]" style={{ color: '#475569' }}>
                  <span>Explore</span><span>Alerts</span><span>API</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="rounded-lg border p-3" style={{ borderColor: '#1e293b', background: '#1E293B' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>Area Momentum</p>
                    <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: '#0c2340', color: '#38BDF8' }}>Updated 2h ago</span>
                  </div>
                  <div className="space-y-2">
                    {[['JVC', 92, '#38BDF8'], ['Dubai Marina', 78, '#A78BFA'], ['Downtown', 61, '#38BDF8']].map(([a, s, c]) => (
                      <div key={a} className="flex items-center gap-3">
                        <span className="text-[10px] w-24" style={{ color: '#94a3b8' }}>{a}</span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: '#0f172a' }}>
                          <div className="h-1.5 rounded-full" style={{ background: c as string, width: `${s}%` }} />
                        </div>
                        <span className="text-[10px] font-mono w-6 text-right" style={{ color: c as string }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[['Distress Deals', '847 active', '#A78BFA'], ['Yield Alert', 'JVC > 8%', '#38BDF8']].map(([l, v, c]) => (
                    <div key={l} className="rounded-lg border p-2.5" style={{ borderColor: '#1e293b', background: '#1E293B' }}>
                      <p className="text-[9px] mb-1" style={{ color: '#475569' }}>{l}</p>
                      <p className="text-xs font-semibold" style={{ color: c as string }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['#0F172A slate', '#38BDF8 sky', '#A78BFA violet', 'Geist Sans', 'Card-based'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* C5 — Registry White */}
          <div className="space-y-2 xl:col-span-2 xl:max-w-lg">
            <p className="text-xs font-semibold text-foreground">C5 · Registry White</p>
            <p className="text-[11px] text-muted-foreground">Deliberate whitespace signals confidence. Anti-terminal. Deep sky blue authority, emerald growth signals. Financial Times digital aesthetic.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{ background: '#FAFAFA', borderColor: '#e2e8f0' }}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: '#e2e8f0', background: '#FFFFFF' }}>
                <span className="text-sm font-bold" style={{ color: '#0C4A6E' }}>The City Registry</span>
                <div className="flex gap-4 text-xs" style={{ color: '#94a3b8' }}>
                  <span>Terminal</span><span>Data</span><span>Research</span>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#0C4A6E', opacity: 0.5 }}>Dubai Real Estate Intelligence</p>
                  <h3 className="text-xl font-bold leading-tight" style={{ color: '#0C4A6E' }}>Transaction volumes<br />at 3-year high.</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[['Deals Q1', '14,284', '#059669'], ['Avg PSF', '1,247', '#0C4A6E'], ['Distress', '847', '#dc2626']].map(([l, v, c]) => (
                    <div key={l} className="border-l-2 pl-3" style={{ borderColor: c as string }}>
                      <p className="text-[10px] mb-0.5" style={{ color: '#94a3b8' }}>{l}</p>
                      <p className="text-lg font-bold" style={{ color: c as string }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  {[['Dubai Marina', '6.9% yield', 'AED 1,890/sqft'], ['JVC', '8.2% yield', 'AED 980/sqft']].map(([a, y, p]) => (
                    <div key={a} className="flex justify-between py-2 text-xs border-b" style={{ borderColor: '#f0f4f8' }}>
                      <span style={{ color: '#0C4A6E' }}>{a}</span>
                      <span style={{ color: '#059669' }}>{y}</span>
                      <span style={{ color: '#94a3b8' }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['#FAFAFA white', '#0C4A6E deep sky', '#059669 emerald', 'Instrument Sans', 'Generous spacing', 'Border-left accents'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── CITY REGISTRY — VC-OPTIMISED DIRECTIONS ────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
          The City Registry — 3 VC-Optimised Directions (Dune Analytics · Palantir · Refinitiv)
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Best for acquisition positioning: signal "data moat + institutional infrastructure" in 3 seconds.
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* D1 — Dune Analytics */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">D1 · Dune Analytics</p>
            <p className="text-[11px] text-muted-foreground">On-chain data aesthetic applied to real estate. Dark background, orange/amber signal, dot-matrix grid. Attracts crypto-PropTech acquirers + DeFi-adjacent VC.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{ background: '#13111C', borderColor: '#2a2540' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#2a2540', background: '#1A1726' }}>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-sm" style={{ background: '#E36B00' }} />
                  <span className="text-sm font-bold" style={{ color: '#F1EDE8' }}>City Registry</span>
                </div>
                <div className="flex gap-3 text-[11px]" style={{ color: '#4a4265' }}>
                  <span style={{ color: '#E36B00' }}>Explore</span><span>Charts</span><span>Queries</span>
                </div>
              </div>
              {/* Dot grid bg + content */}
              <div className="p-4 space-y-3" style={{
                backgroundImage: 'radial-gradient(circle, #2a2540 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}>
                <div className="grid grid-cols-3 gap-2">
                  {[['TRANSACTIONS', '1.66M', '#E36B00'], ['AVG PSF', '1,247', '#F1EDE8'], ['YIELD', '7.4%', '#4FC47A']].map(([l, v, c]) => (
                    <div key={l} className="rounded-lg border p-2.5 backdrop-blur-sm" style={{ borderColor: '#2a2540', background: 'rgba(26,23,38,0.85)' }}>
                      <p className="text-[9px] mb-1 font-mono uppercase tracking-wide" style={{ color: '#4a4265' }}>{l}</p>
                      <p className="text-base font-bold font-mono" style={{ color: c as string }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border p-3 backdrop-blur-sm" style={{ borderColor: '#2a2540', background: 'rgba(26,23,38,0.85)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold" style={{ color: '#E36B00' }}>Momentum by Area</span>
                    <span className="text-[9px] font-mono" style={{ color: '#4a4265' }}>Q1 2026</span>
                  </div>
                  {[['JVC', 92, '#E36B00'], ['Dubai Marina', 78, '#F0B429'], ['Downtown', 51, '#4FC47A']].map(([a, s, c]) => (
                    <div key={a} className="flex items-center gap-3 py-0.5">
                      <span className="text-[10px] w-24" style={{ color: '#8a84a0' }}>{a}</span>
                      <div className="flex-1 h-1 rounded-full" style={{ background: '#2a2540' }}>
                        <div className="h-1 rounded-full" style={{ background: c as string, width: `${s}%` }} />
                      </div>
                      <span className="text-[9px] font-mono" style={{ color: c as string }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['#13111C bg', '#E36B00 orange', 'Dot-matrix grid', 'Mono font', 'Crypto-data signal'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* D2 — Palantir / Intelligence */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">D2 · Intelligence Layer</p>
            <p className="text-[11px] text-muted-foreground">Palantir / Anduril aesthetic. Government-grade data infrastructure feel. Matte black + electric blue. Signals "serious proprietary data" to strategic acquirers.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{ background: '#080C10', borderColor: '#0f1f2e' }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: '#0f1f2e', background: '#0D141C' }}>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#00D4FF' }} />
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#00D4FF', opacity: 0.5 }} />
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#00D4FF', opacity: 0.25 }} />
                </div>
                <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: '#00D4FF' }}>City Registry</span>
                <span className="ml-auto font-mono text-[9px]" style={{ color: '#1a4060' }}>SECURE · VERIFIED · DLD-INDEXED</span>
              </div>
              {/* Content */}
              <div className="p-4 space-y-3">
                <div className="rounded border p-3 font-mono text-[10px]" style={{ borderColor: '#0f1f2e', background: '#0D141C' }}>
                  <div className="flex justify-between mb-2">
                    <span style={{ color: '#00D4FF' }}>SYSTEM STATUS</span>
                    <span style={{ color: '#1e5a30' }}>■ NOMINAL</span>
                  </div>
                  <div className="space-y-1" style={{ color: '#1a4060' }}>
                    {['DLD TRANSACTION INDEX........LIVE', 'DISTRESS SIGNAL ENGINE.......LIVE', 'YIELD COMPUTATION LAYER......LIVE', 'BAYUT INGESTION CRON.........WARN'].map(l => (
                      <div key={l} className="flex justify-between">
                        <span>{l.split('.')[0]}</span>
                        <span style={{ color: l.includes('WARN') ? '#f59e0b' : '#00D4FF' }}>{l.split('.').pop()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['DATA POINTS', '3.2M+', '#00D4FF'], ['COVERAGE', '301 AREAS', '#00D4FF'], ['LATENCY', '<2s', '#4FC47A']].map(([l, v, c]) => (
                    <div key={l} className="rounded border p-2 text-center" style={{ borderColor: '#0f1f2e', background: '#0D141C' }}>
                      <p className="font-mono text-[8px] mb-1" style={{ color: '#1a4060' }}>{l}</p>
                      <p className="font-mono text-sm font-bold" style={{ color: c as string }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['#080C10 matte black', '#00D4FF electric blue', 'System status UI', 'Mono font', 'Infrastructure signal'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* D3 — Refinitiv / Reuters Eikon */}
          <div className="space-y-2 xl:col-span-2 xl:max-w-lg">
            <p className="text-xs font-semibold text-foreground">D3 · Refinitiv / Eikon</p>
            <p className="text-[11px] text-muted-foreground">Reuters Eikon / Refinitiv Workspace aesthetic. Charcoal dark, sharp white type, teal highlights. Maximum acquirer legibility — looks like infrastructure a fund already uses.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{ background: '#1C1C1E', borderColor: '#2c2c2e' }}>
              {/* Header bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: '#2c2c2e', background: '#252527' }}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold tracking-wider uppercase" style={{ color: '#FFFFFF' }}>City Registry</span>
                  <div className="h-3 w-px" style={{ background: '#3c3c3e' }} />
                  <span className="text-[10px] font-mono" style={{ color: '#00BFA5' }}>UAE Real Estate Intelligence</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: '#666668' }}>
                  <span>Markets</span><span>Screener</span><span>Alerts</span>
                  <div className="rounded px-2 py-0.5 text-[9px]" style={{ background: '#00BFA5', color: '#000' }}>PRO</div>
                </div>
              </div>
              {/* Content */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {[['DXB DEALS', '4,284', '+12.3%', true], ['AVG PSF', '1,247', '+4.1%', true], ['DISTRESS IDX', '4.2', '+0.3', true], ['ACTIVE ALERTS', '12', '', null]].map(([l, v, d, up]) => (
                    <div key={l} className="rounded border p-2" style={{ borderColor: '#2c2c2e', background: '#252527' }}>
                      <p className="text-[9px] font-mono mb-1 uppercase" style={{ color: '#555558' }}>{l}</p>
                      <p className="text-base font-bold font-mono" style={{ color: '#FFFFFF' }}>{v}</p>
                      {d && <p className="text-[9px] font-mono" style={{ color: up ? '#00BFA5' : '#FF453A' }}>{d}</p>}
                    </div>
                  ))}
                </div>
                <div className="rounded border p-3" style={{ borderColor: '#2c2c2e', background: '#252527' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-semibold" style={{ color: '#FFFFFF' }}>TOP AREAS — MAY 2026</span>
                    <span className="text-[9px] font-mono" style={{ color: '#00BFA5' }}>↻ LIVE</span>
                  </div>
                  <div className="space-y-1">
                    {[['DUBAI MARINA', '1,890', '6.9%', true], ['JVC', '980', '8.2%', true], ['BUSINESS BAY', '1,420', '7.1%', false]].map(([a, p, y, up]) => (
                      <div key={a} className="flex justify-between font-mono text-[10px] py-0.5 border-t" style={{ borderColor: '#2c2c2e' }}>
                        <span style={{ color: '#aeaeb2' }}>{a}</span>
                        <span style={{ color: '#FFFFFF' }}>AED {p}/sqft</span>
                        <span style={{ color: up ? '#00BFA5' : '#FF453A' }}>{y} yield</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['#1C1C1E charcoal', '#00BFA5 teal', '#FFFFFF white type', 'Mono throughout', 'PRO badge', 'Eikon-legible'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── CITY REGISTRY — PROPTECH / GEO DIRECTIONS ──────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
          The City Registry — 3 PropTech / Geo Directions (Glassmorphism · Map Intelligence · Spatial Data)
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Sourced from Dribbble/Behance 2025 PropTech trends: glassmorphism, geo-first heatmaps, architectural spatial UI.
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* E1 — Glassmorphism Dark */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">E1 · Glassmorphism Dark</p>
            <p className="text-[11px] text-muted-foreground">#1 PropTech UI trend on Dribbble 2025. Frosted glass cards over dark gradient. Feels premium, modern, startup-grade. Strong contrast for data readability.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{
              background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }} />
                  <span className="text-sm font-bold text-white">The City Registry</span>
                </div>
                <div className="flex gap-3 text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <span>Terminal</span><span>Insights</span><span>API</span>
                </div>
              </div>
              {/* Glass cards */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[['Transactions', '1.66M', '#a78bfa'], ['Avg PSF', '1,247', '#34d399'], ['Distress', '847', '#f87171']].map(([l, v, c]) => (
                    <div key={l} className="rounded-xl p-3" style={{
                      background: 'rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.10)',
                    }}>
                      <p className="text-[9px] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</p>
                      <p className="text-base font-bold" style={{ color: c as string }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl p-4" style={{
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-white">Yield by Community</p>
                    <span className="text-[9px] rounded-full px-2 py-0.5" style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>Live</span>
                  </div>
                  {[['Dubai Marina', '6.9%', 75], ['JVC', '8.2%', 90], ['Business Bay', '7.1%', 78]].map(([a, y, w]) => (
                    <div key={a} className="space-y-1 mb-2">
                      <div className="flex justify-between text-[10px]">
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{a}</span>
                        <span style={{ color: '#a78bfa' }}>{y}</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #667eea, #764ba2)', width: `${w}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['Purple gradient bg', 'Frosted glass cards', 'Blur backdrop', '#a78bfa accent', 'Dribbble #1 2025'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* E2 — Map Intelligence */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">E2 · Map Intelligence</p>
            <p className="text-[11px] text-muted-foreground">Geo-first design — map is the hero, data overlays on top. MapBox / Urban Planning aesthetic. Dubai-specific spatial identity. Unique in PropTech data space.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{ background: '#0e1117', borderColor: '#1e2533' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1e2533', background: '#141820' }}>
                <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>City Registry</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#22d3ee' }} />
                  <span className="text-[10px] font-mono" style={{ color: '#22d3ee' }}>LIVE MAP</span>
                </div>
              </div>
              {/* Simulated dark map with overlays */}
              <div className="relative" style={{ background: '#141820', height: '140px' }}>
                {/* Grid lines simulating map */}
                <svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.15 }}>
                  {[20, 40, 60, 80].map(y => <line key={y} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="#22d3ee" strokeWidth="0.5" />)}
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(x => <line key={x} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="#22d3ee" strokeWidth="0.5" />)}
                </svg>
                {/* Heatmap blobs */}
                <div className="absolute rounded-full" style={{ width: 60, height: 60, top: 20, left: '25%', background: 'radial-gradient(circle, rgba(239,68,68,0.6) 0%, transparent 70%)' }} />
                <div className="absolute rounded-full" style={{ width: 80, height: 80, top: 30, left: '55%', background: 'radial-gradient(circle, rgba(34,211,238,0.5) 0%, transparent 70%)' }} />
                <div className="absolute rounded-full" style={{ width: 45, height: 45, top: 50, left: '70%', background: 'radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 70%)' }} />
                {/* Area labels */}
                {[['Marina', '25%', '25px'], ['Downtown', '53%', '35px'], ['JVC', '68%', '60px']].map(([l, x, y]) => (
                  <span key={l} className="absolute text-[9px] font-mono font-bold" style={{ left: x, top: y, color: 'rgba(226,232,240,0.8)' }}>{l}</span>
                ))}
                {/* Legend */}
                <div className="absolute bottom-2 right-3 flex items-center gap-2">
                  {[['High', '#ef4444'], ['Med', '#22d3ee'], ['Watch', '#fbbf24']].map(([l, c]) => (
                    <div key={l} className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full" style={{ background: c }} />
                      <span className="text-[8px] font-mono" style={{ color: 'rgba(226,232,240,0.5)' }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Stats below map */}
              <div className="grid grid-cols-3 divide-x p-0" style={{ borderTop: '1px solid #1e2533', borderColor: '#1e2533' }}>
                {[['HOTSPOTS', '3', '#ef4444'], ['DEALS', '4,284', '#22d3ee'], ['AVG PSF', '1,247', '#fbbf24']].map(([l, v, c]) => (
                  <div key={l} className="p-3 text-center">
                    <p className="text-[9px] font-mono mb-1" style={{ color: '#334155' }}>{l}</p>
                    <p className="text-sm font-bold font-mono" style={{ color: c as string }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['Map-first hero', '#22d3ee cyan', 'Heatmap overlays', 'Grid lines', 'Geo identity'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* E3 — Spatial Data / Architectural */}
          <div className="space-y-2 xl:col-span-2 xl:max-w-lg">
            <p className="text-xs font-semibold text-foreground">E3 · Spatial / Architectural</p>
            <p className="text-[11px] text-muted-foreground">Inspired by "Realto" — top Dribbble PropTech 2025. Architectural floor plan aesthetic fused with institutional data. White + deep navy, precise grid, premium data readability. Most design-forward in the set.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{ background: '#FFFFFF', borderColor: '#e2e8f0' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5" style={{ background: '#F8FAFF', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <span className="text-sm font-bold" style={{ color: '#0F2550', fontFamily: 'serif', letterSpacing: '-0.01em' }}>The City Registry</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]" style={{ color: '#94a3b8' }}>
                  <span>Terminal</span><span>Research</span>
                  <div className="rounded-sm px-2 py-0.5 text-[9px] font-mono" style={{ background: '#0F2550', color: '#FFFFFF' }}>BETA</div>
                </div>
              </div>
              {/* Grid layout — architectural feel */}
              <div className="grid grid-cols-5" style={{ borderBottom: '1px solid #e2e8f0' }}>
                {/* Left — data column */}
                <div className="col-span-2 p-4 space-y-4" style={{ borderRight: '1px solid #e2e8f0' }}>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Transaction Volume</p>
                    <p className="text-3xl font-bold" style={{ color: '#0F2550' }}>1.66M</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#22c55e' }}>↑ 18.3% QoQ</p>
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                    <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Avg PSF</p>
                    <p className="text-2xl font-bold" style={{ color: '#0F2550' }}>1,247</p>
                    <p className="text-[9px] font-mono" style={{ color: '#94a3b8' }}>AED / sqft</p>
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                    <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Top Yield Areas</p>
                    {[['JVC', '8.2%'], ['Marina', '6.9%']].map(([a, y]) => (
                      <div key={a} className="flex justify-between text-xs py-1" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#0F2550' }}>{a}</span>
                        <span style={{ color: '#0F2550', fontWeight: 600 }}>{y}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Right — blueprint grid */}
                <div className="col-span-3 relative" style={{ background: '#F0F4FC', minHeight: 200 }}>
                  <svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.3 }}>
                    {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(y => <line key={`h${y}`} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="#0F2550" strokeWidth="0.5" />)}
                    {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(x => <line key={`v${x}`} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="#0F2550" strokeWidth="0.5" />)}
                  </svg>
                  {/* Building footprint shapes */}
                  <svg width="100%" height="100%" style={{ position: 'absolute' }}>
                    <rect x="15%" y="15%" width="20%" height="30%" fill="none" stroke="#0F2550" strokeWidth="1.5" opacity="0.5" />
                    <rect x="45%" y="20%" width="15%" height="20%" fill="none" stroke="#0F2550" strokeWidth="1.5" opacity="0.5" />
                    <rect x="65%" y="35%" width="20%" height="35%" fill="none" stroke="#1d4ed8" strokeWidth="2" opacity="0.7" />
                    <rect x="66%" y="36%" width="18%" height="33%" fill="#1d4ed8" opacity="0.08" />
                    <text x="67%" y="55%" fontSize="8" fill="#1d4ed8" opacity="0.8" fontFamily="monospace">SELECTED</text>
                    <text x="67%" y="63%" fontSize="7" fill="#1d4ed8" opacity="0.6" fontFamily="monospace">BIZ BAY</text>
                  </svg>
                  {/* Coordinate labels */}
                  <div className="absolute bottom-2 right-2 text-[8px] font-mono" style={{ color: '#94a3b8' }}>
                    25.197°N · 55.274°E
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['#F0F4FC blueprint', '#0F2550 navy', 'Architectural grid', 'Floor plan overlay', 'Spatial identity', 'Serif + data fusion'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── E1 GLASSMORPHISM — COLOR VARIATIONS ─────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
          E1 Glassmorphism — 3 Colour Variations (same frosted glass, different base)
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Same frosted glass cards and layout as E1 — just the gradient and accent colour changed.
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* E1-B — Midnight Teal */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">E1-B · Midnight Teal</p>
            <p className="text-[11px] text-muted-foreground">Dark navy → deep teal. Serious data platform feel. Closer to institutional without being stuffy.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{
              background: 'linear-gradient(135deg, #0a0f1e 0%, #0d2b3e 50%, #0a1628 100%)',
              borderColor: 'rgba(0,188,188,0.15)',
            }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(0,188,188,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full" style={{ background: 'linear-gradient(135deg, #00BCD4, #00838F)' }} />
                  <span className="text-sm font-bold text-white">The City Registry</span>
                </div>
                <div className="flex gap-3 text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <span>Terminal</span><span>Insights</span><span>API</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[['Transactions', '1.66M', '#00BCD4'], ['Avg PSF', '1,247', '#4DD0E1'], ['Yield', '7.4%', '#80DEEA']].map(([l, v, c]) => (
                    <div key={l} className="rounded-xl p-3" style={{ background: 'rgba(0,188,212,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,188,212,0.15)' }}>
                      <p className="text-[9px] mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{l}</p>
                      <p className="text-base font-bold" style={{ color: c as string }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl p-3" style={{ background: 'rgba(0,188,212,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,188,212,0.1)' }}>
                  <p className="text-xs font-semibold text-white mb-2">Top Yield Areas</p>
                  {[['JVC', '8.2%', 90], ['Dubai Marina', '6.9%', 75], ['Business Bay', '7.1%', 78]].map(([a, y, w]) => (
                    <div key={a} className="space-y-0.5 mb-2">
                      <div className="flex justify-between text-[10px]">
                        <span style={{ color: 'rgba(255,255,255,0.45)' }}>{a}</span>
                        <span style={{ color: '#00BCD4' }}>{y}</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: 'rgba(0,188,212,0.15)' }}>
                        <div className="h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #00BCD4, #00838F)', width: `${w}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['Navy gradient', '#00BCD4 teal', 'Frosted glass', 'Data-serious'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* E1-C — Carbon Blue */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">E1-C · Carbon Blue</p>
            <p className="text-[11px] text-muted-foreground">Near-black → electric blue. Crisp, modern, tech-forward. Vercel/Linear aesthetic applied to real estate data.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{
              background: 'linear-gradient(135deg, #080808 0%, #0a0f1a 50%, #0d0d1a 100%)',
              borderColor: 'rgba(59,130,246,0.2)',
            }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(59,130,246,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded" style={{ background: '#3B82F6' }} />
                  <span className="text-sm font-bold text-white">The City Registry</span>
                </div>
                <div className="flex gap-3 text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  <span>Terminal</span><span>Insights</span><span>API</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[['Transactions', '1.66M', '#60A5FA'], ['Avg PSF', '1,247', '#93C5FD'], ['Yield', '7.4%', '#34D399']].map(([l, v, c]) => (
                    <div key={l} className="rounded-xl p-3" style={{ background: 'rgba(59,130,246,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(59,130,246,0.15)' }}>
                      <p className="text-[9px] mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{l}</p>
                      <p className="text-base font-bold" style={{ color: c as string }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl p-3" style={{ background: 'rgba(59,130,246,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(59,130,246,0.1)' }}>
                  <p className="text-xs font-semibold text-white mb-2">Top Yield Areas</p>
                  {[['JVC', '8.2%', 90], ['Dubai Marina', '6.9%', 75], ['Business Bay', '7.1%', 78]].map(([a, y, w]) => (
                    <div key={a} className="space-y-0.5 mb-2">
                      <div className="flex justify-between text-[10px]">
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{a}</span>
                        <span style={{ color: '#60A5FA' }}>{y}</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: 'rgba(59,130,246,0.15)' }}>
                        <div className="h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #3B82F6, #60A5FA)', width: `${w}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['Near-black bg', '#3B82F6 electric blue', 'Frosted glass', 'Vercel/Linear feel'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* E1-D — Onyx Gold */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">E1-D · Onyx Gold</p>
            <p className="text-[11px] text-muted-foreground">Deep charcoal → amber gold. Premium, institutional. Dubai identity embedded in the palette. Distinctive without being flashy.</p>
            <div className="rounded-xl overflow-hidden border shadow-lg" style={{
              background: 'linear-gradient(135deg, #0d0c0a 0%, #1a1508 50%, #120f08 100%)',
              borderColor: 'rgba(201,160,76,0.2)',
            }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(201,160,76,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full" style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)' }} />
                  <span className="text-sm font-bold" style={{ color: '#F5E6C8' }}>The City Registry</span>
                </div>
                <div className="flex gap-3 text-[11px]" style={{ color: 'rgba(245,230,200,0.25)' }}>
                  <span>Terminal</span><span>Insights</span><span>API</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[['Transactions', '1.66M', '#C9A84C'], ['Avg PSF', '1,247', '#D4B86A'], ['Yield', '7.4%', '#4FC47A']].map(([l, v, c]) => (
                    <div key={l} className="rounded-xl p-3" style={{ background: 'rgba(201,160,76,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(201,160,76,0.15)' }}>
                      <p className="text-[9px] mb-1" style={{ color: 'rgba(245,230,200,0.3)' }}>{l}</p>
                      <p className="text-base font-bold" style={{ color: c as string }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl p-3" style={{ background: 'rgba(201,160,76,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(201,160,76,0.1)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#F5E6C8' }}>Top Yield Areas</p>
                  {[['JVC', '8.2%', 90], ['Dubai Marina', '6.9%', 75], ['Business Bay', '7.1%', 78]].map(([a, y, w]) => (
                    <div key={a} className="space-y-0.5 mb-2">
                      <div className="flex justify-between text-[10px]">
                        <span style={{ color: 'rgba(245,230,200,0.4)' }}>{a}</span>
                        <span style={{ color: '#C9A84C' }}>{y}</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: 'rgba(201,160,76,0.12)' }}>
                        <div className="h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #C9A84C, #8B6914)', width: `${w}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['Charcoal gradient', '#C9A84C gold', 'Frosted glass', 'Dubai premium'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── E1 LUXURY REAL ESTATE DIRECTION ─────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
          E1 Glassmorphism — Luxury Real Estate Direction
        </h2>
        <p className="text-[11px] text-muted-foreground">
          DAMAC / Armani Hotel aesthetic meets data terminal. Dubai luxury real estate palette with frosted glass.
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* E1-E — Black Pearl */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">E1-E · Black Pearl</p>
            <p className="text-[11px] text-muted-foreground">Obsidian black + champagne gold. Signature Dubai luxury palette — DAMAC, Armani Residences. Premium data platform, not startup. Silk glass cards over pure black.</p>
            <div className="rounded-xl overflow-hidden border shadow-2xl" style={{
              background: 'linear-gradient(160deg, #0a0a0a 0%, #111008 40%, #0d0c09 100%)',
              borderColor: 'rgba(201,168,92,0.25)',
            }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(201,168,92,0.12)', background: 'rgba(201,168,92,0.03)' }}>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] font-light mb-0.5" style={{ color: 'rgba(201,168,92,0.6)' }}>Dubai · Data Intelligence</p>
                  <span className="text-sm font-bold tracking-wide" style={{ color: '#F5E9C8', fontFamily: 'serif', letterSpacing: '0.08em' }}>THE CITY REGISTRY</span>
                </div>
                <div className="flex gap-4 text-[10px]" style={{ color: 'rgba(245,233,200,0.2)' }}>
                  <span>Terminal</span><span>Insights</span><span>API</span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {/* Hero stat */}
                <div className="rounded-2xl p-5 text-center" style={{
                  background: 'rgba(201,168,92,0.06)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(201,168,92,0.18)',
                }}>
                  <p className="text-[9px] uppercase tracking-[0.25em] mb-2 font-light" style={{ color: 'rgba(201,168,92,0.5)' }}>Market Pulse · Q1 2026</p>
                  <p className="text-4xl font-bold" style={{ color: '#C9A85C', fontFamily: 'serif' }}>7.4%</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(245,233,200,0.4)' }}>Portfolio Average Yield</p>
                </div>
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  {[['Transactions', '1.66M'], ['Avg PSF', '1,247'], ['Distress', '847']].map(([l, v]) => (
                    <div key={l} className="rounded-xl p-3 text-center" style={{
                      background: 'rgba(201,168,92,0.04)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(201,168,92,0.1)',
                    }}>
                      <p className="text-[9px] mb-1.5 font-light" style={{ color: 'rgba(201,168,92,0.45)' }}>{l}</p>
                      <p className="text-sm font-bold font-mono" style={{ color: '#E8D5A3' }}>{v}</p>
                    </div>
                  ))}
                </div>
                {/* Area list */}
                <div className="rounded-xl p-3" style={{
                  background: 'rgba(201,168,92,0.03)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(201,168,92,0.08)',
                }}>
                  <p className="text-[9px] uppercase tracking-[0.2em] mb-3 font-light" style={{ color: 'rgba(201,168,92,0.4)' }}>Premium Communities</p>
                  {[['Dubai Marina', '6.9%'], ['Palm Jumeirah', '5.8%'], ['Downtown Dubai', '6.2%']].map(([a, y], i) => (
                    <div key={a} className="flex justify-between items-center py-1.5" style={{ borderTop: i > 0 ? '1px solid rgba(201,168,92,0.06)' : 'none' }}>
                      <span className="text-xs font-light" style={{ color: 'rgba(245,233,200,0.55)' }}>{a}</span>
                      <span className="text-xs font-mono font-semibold" style={{ color: '#C9A85C' }}>{y}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Footer */}
              <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'rgba(201,168,92,0.08)' }}>
                <span className="text-[9px] uppercase tracking-widest font-light" style={{ color: 'rgba(201,168,92,0.3)' }}>Powered by DLD · Bayut</span>
                <div className="h-3 w-px mx-2" style={{ background: 'rgba(201,168,92,0.2)' }} />
                <span className="text-[9px] uppercase tracking-widest font-light" style={{ color: 'rgba(201,168,92,0.3)' }}>Dubai, UAE</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['Obsidian #0a0a0a', 'Champagne #C9A85C', 'Silk glass', 'Serif brand', 'DAMAC palette'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

          {/* E1-F — Emerald Private Club */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">E1-F · Emerald Private Club</p>
            <p className="text-[11px] text-muted-foreground">Deep forest green + aged gold. Private members club meets PropTech. Sophisticated, European luxury — distinct from every other Dubai data platform.</p>
            <div className="rounded-xl overflow-hidden border shadow-2xl" style={{
              background: 'linear-gradient(160deg, #050d08 0%, #091a0f 40%, #071210 100%)',
              borderColor: 'rgba(180,150,70,0.2)',
            }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(180,150,70,0.1)', background: 'rgba(180,150,70,0.03)' }}>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] font-light mb-0.5" style={{ color: 'rgba(180,150,70,0.6)' }}>Dubai · Intelligence</p>
                  <span className="text-sm font-bold tracking-wide" style={{ color: '#E8DDB5', fontFamily: 'serif', letterSpacing: '0.06em' }}>THE CITY REGISTRY</span>
                </div>
                <div className="flex gap-4 text-[10px]" style={{ color: 'rgba(232,221,181,0.2)' }}>
                  <span>Terminal</span><span>Research</span><span>API</span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-2xl p-5 text-center" style={{
                  background: 'rgba(34,197,94,0.05)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(34,197,94,0.12)',
                }}>
                  <p className="text-[9px] uppercase tracking-[0.25em] mb-2 font-light" style={{ color: 'rgba(180,150,70,0.5)' }}>Market Pulse · Q1 2026</p>
                  <p className="text-4xl font-bold" style={{ color: '#4ADE80', fontFamily: 'serif' }}>7.4%</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(232,221,181,0.35)' }}>Portfolio Average Yield</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['Transactions', '1.66M', '#4ADE80'], ['Avg PSF', '1,247', '#B4964640'], ['Distress', '847', '#F87171']].map(([l, v, c]) => (
                    <div key={l} className="rounded-xl p-3 text-center" style={{
                      background: 'rgba(34,197,94,0.04)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(34,197,94,0.08)',
                    }}>
                      <p className="text-[9px] mb-1.5 font-light" style={{ color: 'rgba(180,150,70,0.4)' }}>{l}</p>
                      <p className="text-sm font-bold font-mono" style={{ color: c as string }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl p-3" style={{
                  background: 'rgba(34,197,94,0.03)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(34,197,94,0.07)',
                }}>
                  <p className="text-[9px] uppercase tracking-[0.2em] mb-3 font-light" style={{ color: 'rgba(180,150,70,0.4)' }}>Premium Communities</p>
                  {[['Dubai Marina', '6.9%'], ['Palm Jumeirah', '5.8%'], ['Downtown Dubai', '6.2%']].map(([a, y], i) => (
                    <div key={a} className="flex justify-between items-center py-1.5" style={{ borderTop: i > 0 ? '1px solid rgba(34,197,94,0.06)' : 'none' }}>
                      <span className="text-xs font-light" style={{ color: 'rgba(232,221,181,0.5)' }}>{a}</span>
                      <span className="text-xs font-mono font-semibold" style={{ color: '#4ADE80' }}>{y}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'rgba(34,197,94,0.07)' }}>
                <span className="text-[9px] uppercase tracking-widest font-light" style={{ color: 'rgba(180,150,70,0.3)' }}>Powered by DLD · Bayut</span>
                <div className="h-3 w-px mx-2" style={{ background: 'rgba(180,150,70,0.15)' }} />
                <span className="text-[9px] uppercase tracking-widest font-light" style={{ color: 'rgba(180,150,70,0.3)' }}>Dubai, UAE</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {['Forest green bg', '#4ADE80 emerald', '#B4964640 gold', 'Private club feel', 'European luxury'].map(t => (
                <span key={t} className="rounded border border-border/40 px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>

        </div>
      </section>

      <div className="rounded-lg border border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-[11px]">VC/acquisition picks: C2 Capital Navy or C1 Registry Dark (institutional signal) · D2 Intelligence Layer (Palantir feel) · D3 Refinitiv (most acquirer-legible)</p>
        <p>Pick one City Registry concept (A–E3, E1-B through F) and one North Capital concept (A or B) — I'll implement across all pages.</p>
      </div>
    </div>
  )
}
