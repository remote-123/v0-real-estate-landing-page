"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { UploadCloud, CheckCircle, Loader2, Lock } from "lucide-react"

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [passcode, setPasscode] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleUpload = async () => {
    if (!file || !passcode) return

    // Guard against Vercel's 4.5MB request body limit
    const MAX_MB = 4.5
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_MB} MB. Compress the PDF first using smallpdf.com or ilovepdf.com.`)
      return
    }

    setLoading(true)
    setError("")
    setSuccess(false)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("passcode", passcode)

    try {
      const res = await fetch("/api/manual-project-import", {
        method: "POST",
        body: formData,
      })

      // Handle non-JSON responses (e.g. Vercel 413 HTML page)
      const contentType = res.headers.get("content-type") || ""
      if (!contentType.includes("application/json")) {
        throw new Error(`Server error ${res.status} — file may be too large or the request timed out.`)
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)

      setSuccess(true)
      setFile(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-secondary/30 pt-32 pb-20 flex items-center justify-center">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full shadow-lg">
          <h1 className="text-2xl font-serif font-bold mb-2">Manual AI Project Import</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Upload a developer PDF directly from your device. Gemini will extract the data and generate a draft in Sanity.
          </p>

          <div className="space-y-4 mb-6">
            {/* Password Security Field */}
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input 
                type="password" 
                placeholder="Admin Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-background focus:ring-2 focus:ring-accent outline-none"
              />
            </div>

            {/* File Dropzone */}
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-background/50 hover:bg-background transition-colors">
              <input 
                type="file" 
                accept=".pdf,image/png,image/jpeg" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden" 
                id="file-upload" 
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-foreground">
                  {file ? file.name : "Click to select a file"}
                </span>
                {file && (
                  <span className={`mt-1 text-xs ${file.size > 4.5 * 1024 * 1024 ? "text-red-500" : "text-muted-foreground"}`}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB {file.size > 4.5 * 1024 * 1024 ? "— too large, compress first" : ""}
                  </span>
                )}
                {!file && <span className="mt-1 text-xs text-muted-foreground">PDF, PNG or JPG · max 4.5 MB</span>}
              </label>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-4 bg-red-500/10 p-3 rounded border border-red-500/20">{error}</p>}
          
          {success && (
            <div className="flex items-center gap-2 text-green-500 text-sm mb-4 bg-green-500/10 p-3 rounded border border-green-500/20">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Successfully drafted in Sanity Studio!
            </div>
          )}

          <Button 
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90" 
            onClick={handleUpload}
            disabled={!file || !passcode || loading}
          >
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing with AI...</> : "Generate Project"}
          </Button>
        </div>
      </main>
      <Footer />
    </>
  )
}