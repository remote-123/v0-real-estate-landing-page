"use client"

import { createAuthClient } from "better-auth/react"

// Auth server is on the same origin as the app — no baseURL needed.
export const authClient = createAuthClient()
