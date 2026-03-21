"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, Globe, ExternalLink } from "lucide-react"

export default function AdminBlogFromUrlPage() {
    const [url, setUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ draftId: string; title: string } | null>(null)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!url) return

        setLoading(true)
        setError("")
        setResult(null)

        try {
            const res = await fetch("/api/blog-from-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ url }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || `Error ${res.status}`)

            setResult({ draftId: data.draftId, title: data.title })
            setUrl("")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const sanityStudioUrl = `https://northcapitaldxb.sanity.studio/desk/post`

    return (
        <div>
            <div className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Admin / Content</p>
                <h1 className="text-2xl font-bold text-foreground">URL to Blog</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Paste any article or report URL. Gemini will read the content and generate a Dubai RE investment blog post in Sanity.
                </p>
            </div>

            <div className="rounded-xl border border-border/50 bg-card/40 p-6 space-y-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Article URL
                        </label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="url"
                                placeholder="https://..."
                                value={url}
                                onChange={(e) => { setUrl(e.target.value); setError(""); setResult(null) }}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm font-mono"
                            />
                        </div>
                        <p className="text-[11px] text-muted-foreground/60">
                            Works with Zawya, Bloomberg, Gulf News, DLD press releases, research reports, etc.
                        </p>
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                            {error}
                        </p>
                    )}

                    {result && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-4 space-y-2">
                            <div className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-emerald-400">Draft created in Sanity</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{result.title}</p>
                                </div>
                            </div>
                            <a
                                href={sanityStudioUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
                            >
                                Open Sanity Studio
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={!url || loading}
                    >
                        {loading
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching &amp; generating...</>
                            : "Generate Blog Post"
                        }
                    </Button>
                </form>
            </div>

            <div className="mt-6 rounded-xl border border-border/40 bg-card/20 p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">How it works</h2>
                <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-3"><span className="text-accent font-bold">1.</span> Fetches and strips the article to plain text</li>
                    <li className="flex gap-3"><span className="text-accent font-bold">2.</span> Passes through Gemini with NorthCapital's editorial voice rules</li>
                    <li className="flex gap-3"><span className="text-accent font-bold">3.</span> Creates a draft post in Sanity — ready for your review and publish</li>
                </ol>
            </div>
        </div>
    )
}
