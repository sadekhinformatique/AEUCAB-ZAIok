import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

// POST: add a participant (memberId, attended?) — or generate certificate (participantId, action=certificate)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const formation = await db.formation.findUnique({ where: { id } })
  if (!formation) return err("Formation introuvable", 404)

  // Generate certificate for existing participant
  if (body.action === "certificate" && body.participantId) {
    const before = await db.formationParticipant.findUnique({ where: { id: body.participantId } })
    if (!before) return err("Participant introuvable", 404)
    const certificateUrl = `/certificates/formation-${formation.id}/participant-${before.id}.pdf`
    const after = await db.formationParticipant.update({ where: { id: body.participantId }, data: { certificateUrl } })
    const userId = await getCurrentUserId()
    await audit({ userId, action: "VALIDATE", entity: "FormationParticipant", entityId: before.id, before, after, description: `Attestation générée pour formation ${formation.title}` })
    return ok(serialize(after))
  }

  // Add new participant
  const memberId = body.memberId
  if (!memberId) return err("Le membre est requis", 422)
  const member = await db.member.findUnique({ where: { id: memberId } })
  if (!member) return err("Membre introuvable", 404)

  const existing = await db.formationParticipant.findUnique({ where: { formationId_memberId: { formationId: id, memberId } } })
  if (existing) return err("Ce participant est déjà inscrit", 409)

  const participant = await db.formationParticipant.create({
    data: {
      formationId: id,
      memberId,
      attended: body.attended === true,
    },
    include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, level: true } } },
  })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "CREATE", entity: "FormationParticipant", entityId: participant.id, after: participant, description: `Inscription de ${member.matricule} à ${formation.title}` })
  return ok(serialize(participant), 201)
}

// DELETE: remove participant (participantId OR memberId in body)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(req.url)
  let participantId = url.searchParams.get("participantId")
  const memberId = url.searchParams.get("memberId")
  if (!participantId && !memberId) {
    const body = await req.json().catch(() => ({}))
    participantId = body.participantId
    if (!participantId && !body.memberId) return err("participantId ou memberId requis", 422)
  }

  let where: Record<string, unknown>
  if (participantId) {
    where = { id: participantId }
  } else {
    where = { formationId_memberId: { formationId: id, memberId: memberId! } }
  }
  const before = await db.formationParticipant.findFirst({ where })
  if (!before) return err("Participant introuvable", 404)
  await db.formationParticipant.delete({ where: { id: before.id } })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "DELETE", entity: "FormationParticipant", entityId: before.id, before, description: `Désinscription de la formation ${id}` })
  return ok({ ok: true })
}
