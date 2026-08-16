import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"
import { resolveStorageUrl } from "@/lib/storage"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const formation = await db.formation.findUnique({
    where: { id },
    include: {
      participants: {
        include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, level: true, email: true, phone: true } } },
        orderBy: { registeredAt: "asc" },
      },
    },
  })
  if (!formation) return err("Formation introuvable", 404)
  return ok(serialize({ ...formation, documentUrl: resolveStorageUrl(formation.documentUrl) }))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const before = await db.formation.findUnique({ where: { id } })
  if (!before) return err("Formation introuvable", 404)

  const allowed = ["title", "description", "trainer", "location", "budget", "documentUrl"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) data[k] = body[k]
  }
  if ("startDate" in body) data.startDate = body.startDate ? new Date(body.startDate) : before.startDate
  if ("endDate" in body) data.endDate = body.endDate ? new Date(body.endDate) : null

  const after = await db.formation.update({ where: { id }, data, include: { _count: { select: { participants: true } } } })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "UPDATE", entity: "Formation", entityId: id, before, after, description: `Mise à jour formation ${before.title}` })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.formation.findUnique({ where: { id } })
  if (!before) return err("Formation introuvable", 404)
  await db.formation.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "DELETE", entity: "Formation", entityId: id, before, description: `Suppression formation ${before.title}` })
  return ok({ ok: true })
}
