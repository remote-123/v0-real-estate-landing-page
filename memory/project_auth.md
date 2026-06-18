---
name: Auth System — NextAuth v5 + DigitalOcean
description: Auth stack, known bugs fixed, gotchas for future changes
type: project
---

Auth fully working as of 2026-06-18.

**Stack:** NextAuth v5 (`next-auth`), `@auth/pg-adapter`, Google OAuth, database sessions stored in DO Managed Postgres.

**Tables in DO DB:** `users`, `accounts`, `sessions`, `verification_tokens` (standard NextAuth schema). Legacy user tracking table renamed `users_legacy`.

**Key files:**
- `auth.ts` — NextAuth config, pg.Pool adapter
- `app/layout.tsx` — async, calls `auth()`, passes session to SessionProvider
- `components/auth/session-provider.tsx` — re-exports SessionProvider from next-auth/react
- `components/auth/user-nav.tsx` — `useSession()` drives Sign In / avatar toggle
- `app/sign-in/page.tsx` — sign-in page (must stay on thecityregistry.com domain)

**SSL fix (auth.ts):** `pg-connection-string` v2 treats `sslmode=require` as `verify-full`, overriding explicit `ssl: { rejectUnauthorized: false }`. Fix: strip `sslmode` param from DATABASE_URL before passing to pg.Pool.
```ts
const dbUrl = (process.env.DATABASE_URL || "").replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "")
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false }, max: 1 })
```

**Critical gotcha — proxy.ts middleware:** `/sign-in` must NOT be in `NORTHCAPITAL_ONLY_PATHS`. If it is, thecityregistry.com redirects sign-in to northcapitaldxb.com, OAuth callback returns to thecityregistry.com, session cookie set on wrong domain → `auth()` reads null → button never updates. Removed in commit `7430349`.

**Why:** OAuth callback URL is always thecityregistry.com (registered with Google). Sign-in page must be on the same domain.

**How to apply:** Never add `/sign-in`, `/api/auth/*` to NORTHCAPITAL_ONLY_PATHS in proxy.ts.
