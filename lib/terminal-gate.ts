/**
 * Terminal unlock check — server-side helper.
 * Returns true if the user should see all rows (no gate):
 *   1. They have an active auth session, OR
 *   2. They submitted their email (cookie terminal_email_unlocked=1 set by EmailGateOverlay)
 *
 * This is a soft gate — the cookie is client-settable by design.
 * Never use this for security-sensitive access control.
 */
import { cookies } from "next/headers"

export const GATE_COOKIE = "terminal_email_unlocked"

export async function isTerminalUnlocked(session: unknown): Promise<boolean> {
  if (session) return true
  try {
    const jar = await cookies()
    return jar.get(GATE_COOKIE)?.value === "1"
  } catch {
    // cookies() can throw outside request context (e.g. static gen)
    return false
  }
}
