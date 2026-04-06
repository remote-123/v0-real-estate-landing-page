"use client"

import { createAuthClient } from "better-auth/react"

// Auth server is on the same origin as the app — no baseURL needed.
// Better Auth will use relative URLs automatically.
export const authClient = createAuthClient()
