import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser, getSessionUserId } from "./auth"

/**
 * Current user id from the authenticated session cookie.
 * Re-checks the account is still active and not locked so that disabling or
 * locking a user revokes their session immediately (no 7-day grace window).
 * Returns null when not authenticated — the middleware already blocks
 * unauthenticated API requests, so in practice this is always resolved.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getSessionUser()
  return user?.id ?? null
}

/**
 * memberId linked to the session user, or null.
 */
export async function getSessionMemberId(): Promise<string | null> {
  const user = await getSessionUser()
  return user?.memberId ?? null
}

/** Board/committee roles allowed on privileged endpoints (kiosque member-space…). */
export const STAFF_ROLES = [
  "PRESIDENT",
  "SECRETAIRE",
  "TRESORIER",
  "CAISSIER",
  "COMMISSAIRE",
  "ADMIN_IT",
] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

/**
 * BOARD-role gate. Returns { error: 401 } if not authenticated,
 * { error: 403 } if authenticated but not a board member.
 */
export async function requireStaff(): Promise<{ error: number | null; user: { id: string } | null }> {
  const user = await getSessionUser()
  if (!user) return { error: 401, user: null }
  if (!STAFF_ROLES.includes(user.role as StaffRole)) return { error: 403, user: null }
  return { error: null, user: { id: user.id } }
}

/**
 * ADMIN_IT-only gate. Returns { error: 401 } if not authenticated,
 * { error: 403 } if authenticated but not an administrator.
 */
export async function requireAdmin(): Promise<{ error: number | null; user: { id: string } | null }> {
  const user = await getSessionUser()
  if (!user) return { error: 401, user: null }
  if (user.role !== "ADMIN_IT") return { error: 403, user: null }
  return { error: null, user: { id: user.id } }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function err(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

export async function audit(params: {
  userId?: string | null
  action: string
  entity: string
  entityId?: string
  before?: unknown
  after?: unknown
  description?: string
}) {
  try {
    const userId = params.userId ?? (await getCurrentUserId())
    await db.auditLog.create({
      data: {
        userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        beforeData: params.before ? JSON.stringify(params.before) : null,
        afterData: params.after ? JSON.stringify(params.after) : null,
        description: params.description,
      },
    })
  } catch (e) {
    // Never let audit failure break a request
    console.error("audit error", e)
  }
}

export function serialize<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}
