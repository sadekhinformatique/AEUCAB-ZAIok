import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { memberId, excuse } = body
  if (!memberId) return err("Le membre est requis", 422)

  const meeting = await db.meeting.findUnique({ where: { id } })
  if (!meeting) return err("Réunion introuvable", 404)

  const existing = await db.meetingParticipant.findUnique({
    where: { meetingId_memberId: { meetingId: id, memberId } },
  })
  if (existing) return err("Ce membre est déjà participant", 409)

  const participant = await db.meetingParticipant.create({
    data: {
      meetingId: id,
      memberId,
      attended: false,
      excuse: excuse || null,
    },
    include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true } } },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "MeetingParticipant",
    entityId: participant.id,
    after: participant,
    description: `Ajout de ${participant.member.firstName} ${participant.member.lastName} à la réunion ${meeting.title}`,
  })
  return ok(serialize(participant), 201)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(req.url)
  const memberId = url.searchParams.get("memberId")
  if (!memberId) return err("memberId est requis", 422)

  const existing = await db.meetingParticipant.findUnique({
    where: { meetingId_memberId: { meetingId: id, memberId } },
  })
  if (!existing) return err("Participant introuvable", 404)

  await db.meetingParticipant.delete({
    where: { meetingId_memberId: { meetingId: id, memberId } },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "DELETE",
    entity: "MeetingParticipant",
    entityId: existing.id,
    before: existing,
    description: `Retrait d'un participant de la réunion`,
  })
  return ok({ ok: true })
}
