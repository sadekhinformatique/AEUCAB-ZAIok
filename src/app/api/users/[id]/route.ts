import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId, requireAdmin } from "@/lib/sgiau/api"
import { hashPassword } from "@/lib/sgiau/auth"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin()
  if (gate.error) return err(gate.error === 401 ? "Non authentifié" : "Accès réservé aux administrateurs", gate.error)
  const { id } = await params
  const user = await db.user.findUnique({
    where: { id },
    include: { member: { select: { matricule: true, firstName: true, lastName: true } } },
  })
  if (!user) return err("Utilisateur introuvable", 404)
  return ok(serialize({ ...user, passwordHash: undefined }))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin()
  if (gate.error) return err(gate.error === 401 ? "Non authentifié" : "Accès réservé aux administrateurs", gate.error)
  const { id } = await params
  const body = await req.json()
  const userId = await getCurrentUserId()
  const before = await db.user.findUnique({ where: { id } })
  if (!before) return err("Utilisateur introuvable", 404)

  const data: Record<string, unknown> = {}
  if (typeof body.isActive === "boolean") data.isActive = body.isActive
  if (body.role) data.role = body.role
  if (typeof body.fullName === "string" && body.fullName.trim()) data.fullName = body.fullName.trim()
  if (typeof body.email === "string" && body.email.trim()) data.email = body.email.trim()
  if (typeof body.username === "string" && body.username.trim()) data.username = body.username.trim()
  if (body.password) data.passwordHash = await hashPassword(String(body.password))
  if (body.unlock) {
    data.failedAttempts = 0
    data.lockedUntil = null
  }

  let after: Awaited<ReturnType<typeof db.user.update>>
  try {
    after = await db.user.update({ where: { id }, data })
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") {
      return err("Nom d'utilisateur ou email déjà utilisé", 409)
    }
    throw e
  }
  await audit({
    userId, action: "UPDATE", entity: "User", entityId: id,
    before: serialize({ ...before, passwordHash: undefined }),
    after: serialize({ ...after, passwordHash: undefined }),
    description: body.unlock
      ? `Déverrouillage utilisateur ${before.username}`
      : `Modification utilisateur ${before.username} (${Object.keys(data).join(", ")})`,
  })
  return ok(serialize({ ...after, passwordHash: undefined }))
}
