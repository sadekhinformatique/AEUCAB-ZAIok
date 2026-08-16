import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportExceptionalParticipant.findUnique({ where: { id } })
  if (!before) return err("Participant introuvable", 404)

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof body.firstName === "string" && body.firstName.trim()) data.firstName = body.firstName.trim()
  if (typeof body.lastName === "string" && body.lastName.trim()) data.lastName = body.lastName.trim()
  if (typeof body.function === "string") data.function = body.function.trim() || null
  if (typeof body.phone === "string") data.phone = body.phone.trim() || null
  if (typeof body.email === "string") data.email = body.email.trim() || null

  const after = await db.sportExceptionalParticipant.update({ where: { id }, data })
  await audit({
    userId: gate.user.id,
    action: "UPDATE",
    entity: "SportExceptionalParticipant",
    entityId: id,
    before,
    after,
    description: `Mise à jour du participant exceptionnel ${after.firstName} ${after.lastName}`,
  })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportExceptionalParticipant.findUnique({ where: { id } })
  if (!before) return err("Participant introuvable", 404)

  const teams = await db.sportTeam.findMany({
    where: { kind: "EXCEPTIONAL" },
    select: { id: true, name: true, participants: true },
  })
  const used = teams.find((t) => (t.participants ? JSON.parse(t.participants).includes(id) : false))
  if (used) {
    return err(`Ce participant est membre de l'équipe « ${used.name} » — retirez-le de l'équipe d'abord`, 409)
  }

  await db.sportExceptionalParticipant.delete({ where: { id } })
  await audit({
    userId: gate.user.id,
    action: "DELETE",
    entity: "SportExceptionalParticipant",
    entityId: id,
    before,
    description: `Retrait du participant exceptionnel ${before.firstName} ${before.lastName}`,
  })
  return ok({ ok: true })
}
