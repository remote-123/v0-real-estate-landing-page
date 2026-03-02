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
    setLoading(true)
    setError("")
    setSuccess(false)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("passcode", passcode) // Send the secret key

    try {
      // Hit our new dedicated manual upload endpoint
      const res = await fetch("/api/manual-project-import", {
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