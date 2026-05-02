'use client'

import { useState, useRef } from 'react'

const QUICK_PROMPTS = [
  'Which areas have the highest yield right now?',
  'Where are distress deals clustering?',
  "What's driving the highest momentum areas?",
  'Which areas have the most mortgage leverage risk?',
  'Show me the off-plan supply pressure by area',
  'What does recent transaction volume say about market direction?',
]

interface ResearcherResult {
  answer: string
  query_type: string
  rows_fetched: number
}

export default function AdminResearcherPage() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResearcherResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(q?: string) {
    const text = (q ?? question).trim()
    if (!text || loading) return

    if (q) setQuestion(q)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/admin/researcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Request failed')
      } else {
        setResult(data as ResearcherResult)
      }
    } catch {
      setError('Network error — check your connection')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-0.5">
          Admin / Automations
        </p>
        <h1 className="text-xl font-bold text-foreground">Market Researcher</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask any question about the Dubai property market. Queries Neon DB live, then Gemini Flash synthesises the answer.
        </p>
      </div>

      {/* Quick prompts */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
          Quick prompts
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => handleSubmit(p)}
              disabled={loading}
              className="rounded border border-border/50 bg-card/40 px-2.5 py-1 font-mono text-xs text-muted-foreground hover:border-border hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          autoFocus
          rows={4}
          maxLength={500}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Which 2-bed areas have gross yield above 7% with at least 50 transactions?"
          className="bg-card border border-border/50 rounded-md p-3 text-sm w-full resize-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-border focus:ring-0"
        />
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] text-muted-foreground">
            {question.length}/500 · Cmd+Enter to submit
          </p>
          <button
            onClick={() => handleSubmit()}
            disabled={loading || question.trim().length === 0}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <svg
                className="h-3.5 w-3.5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {loading ? 'Analysing…' : 'Ask'}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-3">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {result.answer}
          </p>
          <div className="border-t border-border/30 pt-3 flex flex-wrap gap-4">
            <span className="font-mono text-[10px] text-muted-foreground">
              <span className="text-muted-foreground/50 uppercase mr-1">Query</span>
              {result.query_type}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              <span className="text-muted-foreground/50 uppercase mr-1">Rows</span>
              {result.rows_fetched}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              <span className="text-muted-foreground/50 uppercase mr-1">Model</span>
              gemini-2.5-flash
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
