import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const { id, memberId } = await params
  const body = await req.json()
  const { attended, excuse } = body

  const existing = await db.meetingParticipant.findUnique({
    where: { meetingId_memberId: { meetingId: id, memberId } },
  })
  if (!existing) return err("Participant introuvable", 404)

  const data: Record<string, unknown> = {}
  if (typeof attended === "boolean") data.attended = attended
  if (excuse !== undefined) data.excuse = excuse

  const after = await db.meetingParticipant.update({
    where: { meetingId_memberId: { meetingId: id, memberId } },
    data,
    include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true } } },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "UPDATE",
    entity: "MeetingParticipant",
    entityId: existing.id,
    before: existing,
    after,
    description: `Présence mise à jour pour ${after.member.firstName} ${after.member.lastName}`,
  })
  return ok(serialize(after))
}
