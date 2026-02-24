"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { UploadCloud, CheckCircle, Loader2 } from "lucide-react"

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError("")
    setSuccess(false)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/import-pdf", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)
      
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
          <h1 className="text-2xl font-serif font-bold mb-2">Automated Factsheet Importer</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Upload a developer PDF. Gemini AI will extract the data and send it to your Sanity Studio as a draft.
          </p>

          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-6">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden" 
              id="file-upload" 
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">
                {file ? file.name : "Click to select a PDF"}
              </span>
            </label>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          
          {success && (
            <div className="flex items-center gap-2 text-green-500 text-sm mb-4 bg-green-500/10 p-3 rounded">
              <CheckCircle className="h-4 w-4" />
              Successfully sent to Sanity Studio!
            </div>
          )}

          <Button 
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90" 
            onClick={handleUpload}
            disabled={!file || loading}
          >
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting AI Data...</> : "Scan & Import to CMS"}
          </Button>
        </div>
      </main>
    </>
  )
}