import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
// TODO: Add Apple and LinkedIn providers when credentials are set up
import { sql } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return true
      try {
        await sql`
          INSERT INTO users (
            name, email, image,
            provider, provider_account_id,
            created_at, last_seen_at, sign_in_count
          ) VALUES (
            ${user.name ?? null},
            ${user.email},
            ${user.image ?? null},
            ${account.provider},
            ${account.providerAccountId},
            now(), now(), 1
          )
          ON CONFLICT (provider, provider_account_id) DO UPDATE SET
            name          = EXCLUDED.name,
            image         = EXCLUDED.image,
            last_seen_at  = now(),
            sign_in_count = users.sign_in_count + 1
        `
      } catch {
        // Don't block sign-in if DB write fails
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
