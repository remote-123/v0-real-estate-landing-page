import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ""
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

if (!url || !key) {
  throw new Error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY")
}

/** Server-only client. Never import this in client components. */
export const supabaseServer = createClient(url, key)
