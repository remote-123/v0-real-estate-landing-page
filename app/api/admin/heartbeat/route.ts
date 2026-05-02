import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { sql } from "@/lib/db"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase())

async function isAuthed(req: NextRequest): Promise<boolean> {
  const cookieStore = await cookies()
  const passcode = cookieStore.get("admin_auth")?.value
  if (passcode && passcode === process.env.ADMIN_PASSCODE) return true

  // Also accept Bearer token for programmatic access
  const auth = req.headers.get("authorization") ?? ""
  if (auth.startsWith("Bearer ") && auth.slice(7) === process.env.ADMIN_PASSCODE) return true

  return false
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS heartbeat_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      enabled BOOLEAN NOT NULL DEFAULT false,
      criteria TEXT NOT NULL DEFAULT '',
      interval_minutes INTEGER NOT NULL DEFAULT 10,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT heartbeat_single_row CHECK (id = 1)
    )
  `
  await sql`
    INSERT INTO heartbeat_config (id, enabled, criteria, interval_minutes)
    VALUES (1, false, '', 10)
    ON CONFLICT (id) DO NOTHING
  `
}

export async function GET(req: NextRequest) {
  if (!(await isAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureTable()
    const rows = await sql<{
      enabled: boolean
      criteria: string
      interval_minutes: number
      updated_at: string
    }[]>`SELECT enabled, criteria, interval_minutes, updated_at FROM heartbeat_config WHERE id = 1`

    const row = rows[0] ?? { enabled: false, criteria: "", interval_minutes: 10, updated_at: null }
    return NextResponse.json(row)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const enabled = Boolean(body.enabled)
    const criteria = String(body.criteria ?? "").slice(0, 10_000)
    const interval_minutes = Math.max(1, Math.min(60, Number(body.interval_minutes) || 10))

    await ensureTable()
    await sql`
      INSERT INTO heartbeat_config (id, enabled, criteria, interval_minutes, updated_at)
      VALUES (1, ${enabled}, ${criteria}, ${interval_minutes}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        criteria = EXCLUDED.criteria,
        interval_minutes = EXCLUDED.interval_minutes,
        updated_at = NOW()
    `

    return NextResponse.json({ ok: true, enabled, criteria, interval_minutes })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
