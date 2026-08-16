import { NextRequest, NextResponse } from "next/server"
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
  "RESPONSABLE_SPORT",
] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

/**
 * Resolve the member a request applies to, for the member mobile app:
 * - any authenticated user linked to a member (role MEMBER + memberId) → that member
 * - board/admin users without a linked member → the memberId query param (kiosk / simulation)
 * Returns memberId = null when no member can be resolved (caller decides the error).
 */
export async function resolveMemberId(req: NextRequest): Promise<{ error: number | null; memberId: string | null }> {
  const user = await getSessionUser()
  if (!user) return { error: 401, memberId: null }
  if (user.memberId) return { error: null, memberId: user.memberId }
  const memberId = new URL(req.url).searchParams.get("memberId")
  return { error: null, memberId }
}

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

import { isSportResponsable } from "./constants"
export { isSportResponsable, SPORT_RESPONSABLE_ROLE } from "./constants"

/**
 * Sport-responsable gate. Sport decisions (validation des équipes, arbitres,
 * équipes exceptionnelles, lancement de compétition…) sont réservées au
 * responsable des sports de l'Amicale — même le président ne peut pas les
 * remplacer. Returns { error: 401 } if not authenticated,
 * { error: 403 } if authenticated but not the sport responsable.
 */
export async function requireSportResponsable(): Promise<
  | { error: number; user: null }
  | { error: null; user: { id: string; role: string } }
> {
  const user = await getSessionUser()
  if (!user) return { error: 401, user: null }
  if (!isSportResponsable(user.role)) return { error: 403, user: null }
  return { error: null, user: { id: user.id, role: user.role } }
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

/** Crée une notification applicative pour un membre. */
export async function notifyMember(params: {
  memberId: string
  title: string
  message: string
  type?: string
}) {
  try {
    await db.notification.create({
      data: {
        memberId: params.memberId,
        title: params.title,
        message: params.message,
        channel: "APP",
        type: params.type ?? "INFO",
      },
    })
  } catch (e) {
    console.error("notifyMember error", e)
  }
}

/** Crée une notification applicative pour tous les comptes d'un rôle (ex. RSA). */
export async function notifyRole(params: {
  role: string
  title: string
  message: string
  type?: string
}) {
  try {
    const users = await db.user.findMany({
      where: { role: params.role, isActive: true },
      select: { id: true },
    })
    if (!users.length) return
    await db.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title: params.title,
        message: params.message,
        channel: "APP",
        type: params.type ?? "INFO",
      })),
    })
  } catch (e) {
    console.error("notifyRole error", e)
  }
}

/** Crée une notification pour tous les membres actifs (annonces…). */
export async function notifyAllMembers(params: {
  title: string
  message: string
  type?: string
}) {
  try {
    const members = await db.member.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    })
    if (!members.length) return
    await db.notification.createMany({
      data: members.map((m) => ({
        memberId: m.id,
        title: params.title,
        message: params.message,
        channel: "APP",
        type: params.type ?? "INFO",
      })),
    })
  } catch (e) {
    console.error("notifyAllMembers error", e)
  }
}
