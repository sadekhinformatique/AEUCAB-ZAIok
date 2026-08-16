import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

const STATUSES = ["SELECTED", "VALIDATED", "REVOKED"]

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportReferee.findUnique({ where: { id } })
  if (!before) return err("Arbitre introuvable", 404)

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof body.status === "string" && STATUSES.includes(body.status)) {
    data.status = body.status
    data.validatedAt = body.status === "VALIDATED" ? new Date() : before.validatedAt
  }
  if (typeof body.note === "string") data.note = body.note.trim() || null
  if (typeof body.fullName === "string" && body.fullName.trim()) data.fullName = body.fullName.trim()

  const after = await db.sportReferee.update({ where: { id }, data })
  await audit({
    userId: gate.user.id,
    action: body.status === "VALIDATED" ? "VALIDATE" : "UPDATE",
    entity: "SportReferee",
    entityId: id,
    before,
    after,
    description:
      body.status === "VALIDATED"
        ? `Validation de l'arbitre ${after.fullName}`
        : body.status === "REVOKED"
          ? `Révocation de l'arbitre ${after.fullName}`
          : `Mise à jour de l'arbitre ${after.fullName}`,
  })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportReferee.findUnique({ where: { id } })
  if (!before) return err("Arbitre introuvable", 404)

  const used = await db.sportMatch.count({ where: { refereeId: id } })
  if (used > 0) {
    return err("Cet arbitre est affecté à des matchs — retirez-le d'abord de ces matchs", 409)
  }

  await db.sportReferee.delete({ where: { id } })
  await audit({
    userId: gate.user.id,
    action: "DELETE",
    entity: "SportReferee",
    entityId: id,
    before,
    description: `Retrait de l'arbitre ${before.fullName}`,
  })
  return ok({ ok: true })
}
