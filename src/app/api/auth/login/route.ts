import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize } from "@/lib/sgiau/api"
import {
  AUTH_COOKIE,
  cookieOptions,
  LOCK_DURATION_MS,
  LOCK_THRESHOLD,
  verifyPassword,
} from "@/lib/sgiau/auth"
import { makeToken } from "@/lib/sgiau/token"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const username = String(body.username ?? "").trim()
  const password = String(body.password ?? "")
  if (!username || !password) return err("Identifiants requis", 422)

  const user = await db.user.findUnique({ where: { username } })
  if (!user) return err("Identifiants invalides", 401)

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
    return err(`Compte temporairement verrouillé — réessayez dans ${remaining} min`, 423)
  }
  if (!user.isActive) return err("Compte désactivé — contactez l'administrateur", 403)

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  const ua = req.headers.get("user-agent") || null

  let valid = false
  try {
    valid = await verifyPassword(password, user.passwordHash)
  } catch {
    // Legacy/malformed hash — treat as invalid credentials rather than 500
    valid = false
  }
  if (!valid) {
    const attempts = user.failedAttempts + 1
    const locked = attempts >= LOCK_THRESHOLD ? new Date(Date.now() + LOCK_DURATION_MS) : null
    await db.user.update({
      where: { id: user.id },
      data: { failedAttempts: attempts, lockedUntil: locked },
    })
    await db.sessionLog.create({
      data: { userId: user.id, success: false, ipAddress: ip, userAgent: ua },
    })
    await audit({
      userId: user.id,
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: user.id,
      description: `Échec de connexion (${attempts}/${LOCK_THRESHOLD}) pour ${username}`,
    })
    return err(
      locked
        ? `Compte verrouillé après ${LOCK_THRESHOLD} tentatives — réessayez dans ${Math.ceil(LOCK_DURATION_MS / 60000)} min`
        : "Identifiants invalides",
      401
    )
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  })
  await db.sessionLog.create({
    data: { userId: user.id, success: true, ipAddress: ip, userAgent: ua },
  })
  await audit({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    description: `Connexion de ${username}`,
  })

  const token = await makeToken(user.id)
  const res = ok(
    serialize({
      user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role },
    })
  )
  res.cookies.set(AUTH_COOKIE, token, cookieOptions())
  return res
}
