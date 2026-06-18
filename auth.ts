import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import PostgresAdapter from "@auth/pg-adapter"
import { Pool } from "pg"

// Strip sslmode from connection string — pg-connection-string v2 treats sslmode=require
// as verify-full (requires trusted CA cert), which overrides ssl.rejectUnauthorized=false.
// DO Managed Postgres uses an internal CA, so we handle SSL ourselves.
const dbUrl = (process.env.DATABASE_URL || "").replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "")

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 1,
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    session({ session, user }) {
      if (user?.id) session.user.id = user.id
      return session
    },
  },
  trustHost: true,
})
