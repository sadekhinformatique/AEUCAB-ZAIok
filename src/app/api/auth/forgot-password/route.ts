import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit } from "@/lib/sgiau/api"
import { hashPassword, LOCK_THRESHOLD, LOCK_DURATION_MS } from "@/lib/sgiau/auth"
import { passwordError } from "@/lib/sgiau/password-policy"

export const dynamic = "force-dynamic"

/**
 * Récupération de mot de passe (auto-service, sans email/SMS).
 * Le membre vérifie son identité avec une donnée personnelle de son
 * dossier (date de naissance, email ou téléphone), puis définit un
 * nouveau mot de passe. Toute tentative échouée compte comme un échec
 * de connexion (verrouillage temporaire après LOCK_THRESHOLD échecs).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const username = String(body.username ?? "").trim()
  const verification = String(body.verification ?? "").trim()
  const newPassword = String(body.newPassword ?? "")

  if (!username || !verification || !newPassword) {
    return err("Identifiant, vérification et nouveau mot de passe sont requis", 422)
  }

  const user = await db.user.findUnique({ where: { username } })
  if (!user || !user.isActive) {
    // Message volontairement générique pour ne pas révéler l'existence du compte
    return err("Vérification impossible — identifiant introuvable ou compte désactivé", 404)
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
    return err(`Trop de tentatives — réessayez dans ${remaining} min`, 423)
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"

  // Charger les données personnelles du membre lié (si compte membre)
  let member: { birthDate: Date | null; email: string | null; phone: string | null } | null = null
  if (user.memberId) {
    member = await db.member.findUnique({
      where: { id: user.memberId },
      select: { birthDate: true, email: true, phone: true },
    })
  }

  // Vérification : date de naissance (AAAA-MM-JJ), email ou téléphone
  const verif = verification.toLocaleLowerCase("fr").replace(/[\s.-]/g, "")
  const birthOk = !!member?.birthDate && verification.length >= 8 &&
    verif === member.birthDate.toISOString().slice(0, 10).replace(/[\s.-]/g, "")
  const emailOk = !!member?.email && verif === member.email.toLocaleLowerCase("fr").trim().replace(/[\s.-]/g, "")
  const phoneOk = !!member?.phone && verif === member.phone.replace(/[\s.-]/g, "").toLocaleLowerCase("fr")

  if (!birthOk && !emailOk && !phoneOk) {
    const attempts = user.failedAttempts + 1
    const locked = attempts >= LOCK_THRESHOLD ? new Date(Date.now() + LOCK_DURATION_MS) : null
    await db.user.update({
      where: { id: user.id },
      data: { failedAttempts: attempts, lockedUntil: locked },
    })
    await audit({
      userId: user.id,
      action: "RECOVERY_FAILED",
      entity: "User",
      entityId: user.id,
      description: `Échec de vérification mot de passe oublié (${attempts}/${LOCK_THRESHOLD}) pour ${username}`,
    })
    return err(
      locked
        ? `Trop de tentatives — compte verrouillé pendant ${Math.ceil(LOCK_DURATION_MS / 60000)} min`
        : "Vérification incorrecte — réessayez avec votre date de naissance, email ou téléphone",
      401
    )
  }

  const pwError = passwordError(newPassword)
  if (pwError) return err(pwError, 422)

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      failedAttempts: 0,
      lockedUntil: null,
      mustChangePassword: false,
    },
  })
  await db.sessionLog.create({
    data: { userId: user.id, success: true, ipAddress: ip, userAgent: req.headers.get("user-agent") || null },
  })
  await audit({
    userId: user.id,
    action: "RECOVERY",
    entity: "User",
    entityId: user.id,
    description: `Mot de passe réinitialisé via « mot de passe oublié » pour ${username}`,
  })

  return ok({ success: true, message: "Mot de passe réinitialisé — connectez-vous avec votre nouveau mot de passe." })
}
