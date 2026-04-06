import { betterAuth } from "better-auth"
import { Pool } from "pg"
import { headers } from "next/headers"

// Better Auth instance — used by the API route handler
const _auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  // Allow all localhost ports for local dev + production domain
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "https://www.northcapitaldxb.com",
    "https://northcapitaldxb.com",
  ],
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    },
  },
})

/** Returns the Better Auth instance (used by the API route handler) */
export function getAuth() {
  return _auth
}

/**
 * Server-component session getter — drop-in replacement for NextAuth's auth().
 * Returns { user, session } or null.
 */
export async function auth() {
  return _auth.api.getSession({ headers: await headers() })
}
