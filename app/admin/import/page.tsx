"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UploadCloud, CheckCircle, Loader2, FileText } from "lucide-react"

export default function AdminImportPage() {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")

    const handleUpload = async () => {
        if (!file) return

        const MAX_MB = 4.5
        if (file.size > MAX_MB * 1024 * 1024) {
            setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${MAX_MB} MB. Compress at smallpdf.com first.`)
            return
        }

        setLoading(true)
        setError("")
        setSuccess(false)

        const formData = new FormData()
        formData.append("file", file)

        try {
            const res = await fetch("/api/project-pdf-upload", {
                method: "POST",
                body: formData,
                credentials: "include",
            })

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
        <div>
            <div className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Admin / Content</p>
                <h1 className="text-2xl font-bold text-foreground">Import PDF</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Upload a developer brochure or project PDF. Gemini will extract data and create a draft in Sanity.
                </p>
            </div>

            <div className="rounded-xl border border-border/50 bg-card/40 p-6 space-y-5">
                {/* Dropzone */}
                <div className="border-2 border-dashed border-border rounded-xl p-10 text-center bg-background/40 hover:bg-background/60 transition-colors">
                    <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg"
                        onChange={(e) => { setFile(e.target.files?.[0] || null); setSuccess(false); setError("") }}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                        {file ? (
                            <>
                                <FileText className="h-10 w-10 text-accent" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                                    <p className={`text-xs mt-0.5 ${file.size > 4.5 * 1024 * 1024 ? "text-red-500" : "text-muted-foreground"}`}>
                                        {(file.size / 1024 / 1024).toFixed(1)} MB
                                        {file.size > 4.5 * 1024 * 1024 ? " — too large, compress first" : ""}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">Click to select a file</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">PDF, PNG or JPG · max 4.5 MB</p>
                                </div>
                            </>
                        )}
                    </label>
                </div>

                {error && (
                    <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                        {error}
                    </p>
                )}

                {success && (
                    <div className="flex items-center gap-2 text-emerald-500 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        Draft created in Sanity Studio — ready to review and publish.
                    </div>
                )}

                <Button
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={handleUpload}
                    disabled={!file || loading}
                >
                    {loading
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing with Gemini...</>
                        : "Generate Project Draft"
                    }
                </Button>
            </div>
        </div>
    )
}
