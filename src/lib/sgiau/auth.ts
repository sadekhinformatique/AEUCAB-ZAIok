/**
 * SGIAU — Authentication helpers (server-side).
 *
 * Real authentication: bcrypt password hashing, HMAC-signed session cookies,
 * account lockout after repeated failures. Used by /api/auth/* and by every
 * route that needs the current user.
 */
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { AUTH_COOKIE, readToken, SESSION_TTL_MS } from "./token"

export { AUTH_COOKIE }

/** Initial password for accounts created by the adhesion workflow. */
export const DEFAULT_INITIAL_PASSWORD = "Sgiau@2026!"

export const LOCK_THRESHOLD = 5
export const LOCK_DURATION_MS = 15 * 60 * 1000

export const hashPassword = (pw: string): Promise<string> => bcrypt.hash(pw, 12)
export const verifyPassword = (pw: string, hash: string): Promise<boolean> => bcrypt.compare(pw, hash)

/** User id from the session cookie, or null. */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies()
  const token = store.get(AUTH_COOKIE)?.value
  const data = await readToken(token)
  return data?.uid ?? null
}

/**
 * Full user from the session cookie, or null. Re-checks the user is still
 * active and not locked — a disabled/locked account loses its session.
 */
export async function getSessionUser() {
  const uid = await getSessionUserId()
  if (!uid) return null
  const user = await db.user.findUnique({ where: { id: uid } })
  if (!user || !user.isActive) return null
  if (user.lockedUntil && user.lockedUntil > new Date()) return null
  return user
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  }
}
