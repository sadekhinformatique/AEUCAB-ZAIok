import { db } from "@/lib/db"
import { ok, audit } from "@/lib/sgiau/api"
import { AUTH_COOKIE, cookieOptions, getSessionUserId } from "@/lib/sgiau/auth"

export const dynamic = "force-dynamic"

export async function POST() {
  // La déconnexion doit TOUJOURS aboutir : le cookie est effacé même si la
  // journalisation échoue (base en pause, timeout…) — sinon l'utilisateur
  // reste « connecté » sans pouvoir se déconnecter.
  try {
    const uid = await getSessionUserId()
    if (uid) {
      const open = await db.sessionLog.findFirst({
        where: { userId: uid, logoutAt: null, success: true },
        orderBy: { loginAt: "desc" },
      })
      if (open) {
        await db.sessionLog.update({ where: { id: open.id }, data: { logoutAt: new Date() } })
      }
      await audit({
        userId: uid,
        action: "LOGOUT",
        entity: "User",
        entityId: uid,
        description: "Déconnexion",
      })
    }
  } catch (e) {
    console.error("logout: journalisation impossible, session effacée quand même", (e as Error).message)
  }
  const res = ok({ ok: true })
  res.cookies.set(AUTH_COOKIE, "", { ...cookieOptions(), maxAge: 0 })
  return res
}
