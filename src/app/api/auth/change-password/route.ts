import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize } from "@/lib/sgiau/api"
import { AUTH_COOKIE, cookieOptions, getSessionUser, hashPassword, verifyPassword } from "@/lib/sgiau/auth"
import { makeToken } from "@/lib/sgiau/token"

export const dynamic = "force-dynamic"

const MIN_PASSWORD_LENGTH = 8

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return err("Non authentifié", 401)

  const body = await req.json().catch(() => ({}))
  const currentPassword = String(body.currentPassword ?? "")
  const newPassword = String(body.newPassword ?? "")

  if (!currentPassword || !newPassword) return err("Champs requis", 422)
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return err(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`, 422)
  }
  if (newPassword === currentPassword) {
    return err("Le nouveau mot de passe doit être différent de l'actuel", 422)
  }

  let valid = false
  try {
    valid = await verifyPassword(currentPassword, user.passwordHash)
  } catch {
    valid = false
  }
  if (!valid) return err("Mot de passe actuel incorrect", 401)

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: null,
    },
  })

  await audit({
    userId: user.id,
    action: "PASSWORD_CHANGED",
    entity: "User",
    entityId: user.id,
    description: "Mot de passe modifié (changement forcé)",
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
