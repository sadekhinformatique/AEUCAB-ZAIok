import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const scope = url.searchParams.get("scope") // ACTIVITY | MEETING | FORMATION
  const scopeId = url.searchParams.get("scopeId")
  const memberId = url.searchParams.get("memberId")

  const where: Record<string, unknown> = {}
  if (scope) where.scope = scope
  if (scopeId) where.scopeId = scopeId
  if (memberId) where.memberId = memberId

  const presences = await db.presence.findMany({
    where,
    orderBy: { checkInAt: "desc" },
    take: 500,
    include: {
      member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true } },
    },
  })
  return ok(serialize(presences))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { memberId, scope, scopeId, method } = body
  if (!memberId) return err("Le membre est requis", 422)
  if (!scope) return err("Le scope (ACTIVITY/MEETING) est requis", 422)
  if (!scopeId) return err("Le scopeId est requis", 422)

  // Verify target exists
  if (scope === "ACTIVITY") {
    const a = await db.activity.findUnique({ where: { id: scopeId } })
    if (!a) return err("Activité introuvable", 404)
  } else if (scope === "MEETING") {
    const m = await db.meeting.findUnique({ where: { id: scopeId } })
    if (!m) return err("Réunion introuvable", 404)
  }

  // Prevent duplicates (one check-in per member per scope/scopeId)
  const existing = await db.presence.findFirst({
    where: { memberId, scope, scopeId },
  })
  if (existing) return err("Ce membre a déjà été enregistré", 409)

  const presence = await db.presence.create({
    data: {
      memberId,
      scope,
      scopeId,
      method: method || "MANUAL",
    },
    include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true } } },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "Presence",
    entityId: presence.id,
    after: presence,
    description: `Pointage de ${presence.member.firstName} ${presence.member.lastName} (${method || "MANUAL"})`,
  })
  return ok(serialize(presence), 201)
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return err("id est requis", 422)
  const before = await db.presence.findUnique({ where: { id } })
  if (!before) return err("Présence introuvable", 404)
  await db.presence.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "DELETE",
    entity: "Presence",
    entityId: id,
    before,
    description: `Suppression d'un pointage`,
  })
  return ok({ ok: true })
}
