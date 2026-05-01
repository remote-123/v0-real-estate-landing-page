# Database Access

## From Scripts / Bash
Neon project is Vercel-integrated — lives under Vercel's Neon org, NOT personal Neon account.
Neon MCP tools cannot see it. Use `.env.local` directly.

```js
import postgres from 'postgres'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]
const sql = postgres(url, { ssl: 'require', max: 1 })

const rows = await sql`SELECT ...`
await sql.end()
```

## From App Code
```ts
// lib/db.ts — already configured
import { sql } from '@/lib/db'
const rows = await sql`SELECT ...`
```

## Connection Config
- SSL: required (`ssl: 'require'`)
- Max connections: 1 (pooled Neon URL handles the rest)
- Driver: `postgres` (postgres.js)

## NUMERIC Columns
postgres.js returns NUMERIC as strings. Always coerce:
```ts
Number(row.field)
```

## Neon Branches
Main branch = production. Don't create branches unless explicitly needed.
