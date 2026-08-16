import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

const STATUSES = ["PENDING", "ACTIVE", "REVOKED"]

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportDelegate.findUnique({ where: { id }, include: { member: true } })
  if (!before) return err("Responsable introuvable", 404)

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof body.status === "string" && STATUSES.includes(body.status)) {
    data.status = body.status
    data.validatedAt = body.status === "ACTIVE" ? new Date() : before.validatedAt
  }

  const after = await db.sportDelegate.update({ where: { id }, data })
  const who = before.member ? `${before.member.firstName} ${before.member.lastName}` : before.memberId
  await audit({
    userId: gate.user.id,
    action: body.status === "ACTIVE" ? "VALIDATE" : "UPDATE",
    entity: "SportDelegate",
    entityId: id,
    before,
    after,
    description:
      body.status === "ACTIVE"
        ? `Validation de ${who} comme responsable sportif de ${before.className}${before.level ? ` ${before.level}` : ""}`
        : body.status === "REVOKED"
          ? `Révocation de ${who} (responsable sportif de ${before.className}${before.level ? ` ${before.level}` : ""})`
          : `Mise à jour du responsable sportif de ${before.className}`,
  })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportDelegate.findUnique({ where: { id }, include: { member: true } })
  if (!before) return err("Responsable introuvable", 404)

  await db.sportDelegate.delete({ where: { id } })
  const who = before.member ? `${before.member.firstName} ${before.member.lastName}` : before.memberId
  await audit({
    userId: gate.user.id,
    action: "DELETE",
    entity: "SportDelegate",
    entityId: id,
    before,
    description: `Retrait de ${who} comme responsable sportif de ${before.className}${before.level ? ` ${before.level}` : ""}`,
  })
  return ok({ ok: true })
}
