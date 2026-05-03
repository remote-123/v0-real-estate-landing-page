import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import PostgresAdapter from "@auth/pg-adapter"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
