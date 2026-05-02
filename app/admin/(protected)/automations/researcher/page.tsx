import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Researcher — Admin',
  robots: { index: false, follow: false },
}

export default function AdminResearcherPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Researcher</h1>
        <p className="text-sm text-muted-foreground mt-1">Automated research tasks — coming soon.</p>
      </div>
      <div className="rounded-xl border border-border/50 bg-card/40 p-8 text-center text-sm text-muted-foreground">
        Placeholder — details to be added.
      </div>
    </div>
  )
}
