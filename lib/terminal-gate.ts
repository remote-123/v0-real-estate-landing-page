/**
 * Terminal unlock check — server-side helper.
 * Auth gating temporarily disabled — all users see full data.
 * Re-enable when Better Auth OAuth is confirmed working.
 */
export const GATE_COOKIE = "terminal_email_unlocked"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function isTerminalUnlocked(_session: unknown): Promise<boolean> {
  return true
}
