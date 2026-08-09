import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId, requireAdmin } from "@/lib/sgiau/api"
import { hashPassword } from "@/lib/sgiau/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const gate = await requireAdmin()
  if (gate.error) return err(gate.error === 401 ? "Non authentifié" : "Accès réservé aux administrateurs", gate.error)
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const role = url.searchParams.get("role")

  const where: Record<string, unknown> = {}
  if (role && role !== "ALL") where.role = role
  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { username: { contains: q } },
      { email: { contains: q } },
    ]
  }

  const items = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { sessions: true, auditLogs: true } },
      member: { select: { matricule: true, firstName: true, lastName: true } },
    },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [total, active, locked, sessionsToday] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.user.count({ where: { lockedUntil: { gt: new Date() } } }),
    db.sessionLog.count({ where: { loginAt: { gte: today } } }),
  ])

  return ok({
    items: serialize(items).map(({ passwordHash: _ph, ...user }) => user),
    stats: { total, active, locked, sessionsToday },
  })
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin()
  if (gate.error) return err(gate.error === 401 ? "Non authentifié" : "Accès réservé aux administrateurs", gate.error)
  const body = await req.json()
  const { fullName, username, email, role, password, memberId } = body
  if (!fullName || !username || !email || !password) return err("Champs manquants", 422)

  const exists = await db.user.findUnique({ where: { username } }).catch(() => null)
  if (exists) return err("Ce nom d'utilisateur existe déjà", 409)
  const existsEmail = await db.user.findUnique({ where: { email } }).catch(() => null)
  if (existsEmail) return err("Cet email existe déjà", 409)

  const userId = await getCurrentUserId()
  const user = await db.user.create({
    data: {
      fullName, username, email, role: role || "MEMBER",
      passwordHash: await hashPassword(String(password)),
      // A password set by an admin is a temporary password: force the change.
      mustChangePassword: true,
      isActive: true,
      memberId: memberId || null,
    },
    include: { member: { select: { matricule: true } } },
  })

  await audit({ userId, action: "CREATE", entity: "User", entityId: user.id, after: { ...user, passwordHash: "***" }, description: `Création utilisateur ${username} (${role})` })
  return ok(serialize({ ...user, passwordHash: undefined }), 201)
}
