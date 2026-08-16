import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"
import { resolveUrlArray } from "@/lib/storage"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const activity = await db.activity.findUnique({
    where: { id },
    include: {
      participants: {
        include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, level: true } } },
        orderBy: { registeredAt: "asc" },
      },
      expenses: { orderBy: { date: "desc" }, take: 30 },
      presences: {
        include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true } } },
        orderBy: { checkInAt: "asc" },
      },
      _count: { select: { participants: true, expenses: true, presences: true } },
    },
  })
  if (!activity) return err("Activité introuvable", 404)
  return ok(serialize({ ...activity, photoUrls: resolveUrlArray(activity.photoUrls) }))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const before = await db.activity.findUnique({ where: { id } })
  if (!before) return err("Activité introuvable", 404)

  const allowed = ["name", "type", "startDate", "endDate", "location", "budget", "description", "status"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) {
      if (k === "startDate" || k === "endDate") data[k] = body[k] ? new Date(body[k]) : null
      else if (k === "budget") data[k] = Number(body[k]) || 0
      else data[k] = body[k]
    }
  }
  const after = await db.activity.update({ where: { id }, data })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "UPDATE",
    entity: "Activity",
    entityId: id,
    before,
    after,
    description: `Modification activité ${before.name}`,
  })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.activity.findUnique({ where: { id } })
  if (!before) return err("Activité introuvable", 404)
  await db.activity.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "DELETE",
    entity: "Activity",
    entityId: id,
    before,
    description: `Suppression activité ${before.name}`,
  })
  return ok({ ok: true })
}
