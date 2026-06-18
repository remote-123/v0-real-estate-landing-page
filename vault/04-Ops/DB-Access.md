# Database Access

## From Scripts / Bash
DB is DigitalOcean Managed Postgres. Use `.env.local` directly (DATABASE_URL set to DO connection string).

```js
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 })

const rows = await sql`SELECT ...`
await sql.end()
```

Or use the shared client in ingest scripts:
```ts
import { sql } from './ingest/db-client'
```

## From App Code
```ts
// lib/db.ts — already configured
import { sql } from '@/lib/db'
const rows = await sql`SELECT ...`
```

## Connection Config
- SSL: required (`ssl: 'require'`)
- Max connections: 1 (safe for serverless)
- Driver: `postgres` (postgres.js)
- Host: `main-postgres-do-user-38763524-0.f.db.ondigitalocean.com:25060`
- DB: `defaultdb`, User: `doadmin`

## NUMERIC Columns
postgres.js returns NUMERIC as strings. Always coerce:
```ts
Number(row.field)
```
