import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { memberId, role } = body
  if (!memberId) return err("Le membre est requis", 422)

  const activity = await db.activity.findUnique({ where: { id } })
  if (!activity) return err("Activité introuvable", 404)

  const existing = await db.activityParticipant.findUnique({
    where: { activityId_memberId: { activityId: id, memberId } },
  })
  if (existing) return err("Ce membre est déjà inscrit", 409)

  const participant = await db.activityParticipant.create({
    data: {
      activityId: id,
      memberId,
      role: role || "PARTICIPANT",
    },
    include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true } } },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "ActivityParticipant",
    entityId: participant.id,
    after: participant,
    description: `Inscription de ${participant.member.firstName} ${participant.member.lastName} à ${activity.name}`,
  })
  return ok(serialize(participant), 201)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(req.url)
  const memberId = url.searchParams.get("memberId")
  if (!memberId) return err("memberId est requis", 422)

  const existing = await db.activityParticipant.findUnique({
    where: { activityId_memberId: { activityId: id, memberId } },
  })
  if (!existing) return err("Inscription introuvable", 404)

  await db.activityParticipant.delete({
    where: { activityId_memberId: { activityId: id, memberId } },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "DELETE",
    entity: "ActivityParticipant",
    entityId: existing.id,
    before: existing,
    description: `Désinscription d'un membre de l'activité`,
  })
  return ok({ ok: true })
}
