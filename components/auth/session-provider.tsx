"use client"

// Better Auth does not require a session provider wrapper.
// This component is kept as a passthrough for backwards compatibility.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
