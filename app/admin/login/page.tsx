"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminLoginPage() {
    const router = useRouter()
    const [passcode, setPasscode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passcode }),
            })

            if (!res.ok) {
                setError("Invalid passcode.")
                return
            }

            router.push("/admin/import")
        } catch {
            setError("Something went wrong. Try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="flex items-center justify-center mb-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 border border-accent/20">
                        <ShieldCheck className="h-6 w-6 text-accent" />
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-xl font-bold text-foreground tracking-tight">Admin Access</h1>
                    <p className="text-sm text-muted-foreground mt-1">North Capital DXB</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="password"
                            placeholder="Passcode"
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            autoFocus
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                            {error}
                        </p>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={!passcode || loading}
                    >
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Enter"}
                    </Button>
                </form>
            </div>
        </div>
    )
}
