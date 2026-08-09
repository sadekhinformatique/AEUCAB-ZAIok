import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const meeting = await db.meeting.findUnique({
    where: { id },
    include: {
      participants: {
        include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, phone: true } } },
        orderBy: { member: { lastName: "asc" } },
      },
      _count: { select: { participants: true } },
    },
  })
  if (!meeting) return err("Réunion introuvable", 404)
  return ok(serialize(meeting))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const before = await db.meeting.findUnique({ where: { id } })
  if (!before) return err("Réunion introuvable", 404)

  const allowed = ["title", "agenda", "decisions", "pvUrl", "startDate", "endDate", "location", "status", "reminderSent"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) {
      if (k === "startDate" || k === "endDate") data[k] = body[k] ? new Date(body[k]) : null
      else data[k] = body[k]
    }
  }
  const after = await db.meeting.update({ where: { id }, data })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "UPDATE",
    entity: "Meeting",
    entityId: id,
    before,
    after,
    description: `Modification réunion ${before.title}`,
  })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.meeting.findUnique({ where: { id } })
  if (!before) return err("Réunion introuvable", 404)
  await db.meeting.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "DELETE",
    entity: "Meeting",
    entityId: id,
    before,
    description: `Suppression réunion ${before.title}`,
  })
  return ok({ ok: true })
}
