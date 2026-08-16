import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"
import { SANCTION_CARD_TYPES, SANCTION_STATUSES, cardTypeLabel, normalizeCard } from "@/lib/sgiau/sport"

export const dynamic = "force-dynamic"

/**
 * Mise à jour d'une sanction (durée, motif, statut : ACTIVE / SERVED / CANCELED).
 * PUT /api/sport/sanctions/:id — réservée au responsable des sports de l'Amicale.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportSanction.findUnique({ where: { id } })
  if (!before) return err("Sanction introuvable", 404)

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.playerName !== undefined) {
    const name = String(body.playerName).trim()
    if (!name) return err("Le nom du joueur est requis", 422)
    data.playerName = name
  }
  if (body.cardType !== undefined) {
    const type = normalizeCard(body.cardType)
    if (!(SANCTION_CARD_TYPES as readonly string[]).includes(type)) return err("Type de carton invalide", 422)
    data.cardType = type
  }
  if (body.matchesSuspended !== undefined) {
    data.matchesSuspended = Math.max(0, Number(body.matchesSuspended) || 0)
  }
  if (body.reason !== undefined) data.reason = body.reason ? String(body.reason) : null
  if (body.status !== undefined) {
    if (!(SANCTION_STATUSES as readonly string[]).includes(body.status)) return err("Statut invalide", 422)
    data.status = body.status
  }
  if (body.teamId !== undefined) {
    if (body.teamId) {
      const team = await db.sportTeam.findUnique({ where: { id: body.teamId }, select: { id: true, competitionId: true, disciplineId: true } })
      if (!team) return err("Équipe introuvable", 404)
      if (team.competitionId !== before.competitionId || team.disciplineId !== before.disciplineId) {
        return err("L'équipe doit appartenir à cette compétition et à cette discipline", 422)
      }
    }
    data.teamId = body.teamId || null
  }
  if (body.memberId !== undefined) {
    if (body.memberId) {
      const member = await db.member.findUnique({ where: { id: body.memberId }, select: { id: true } })
      if (!member) return err("Membre introuvable", 404)
    }
    data.memberId = body.memberId || null
  }

  const after = await db.sportSanction.update({ where: { id }, data })
  await audit({
    userId: gate.user.id,
    action: "UPDATE",
    entity: "SportSanction",
    entityId: id,
    before,
    after,
    description: data.status === "SERVED"
      ? `Suspension servie pour ${after.playerName} (${cardTypeLabel(after.cardType)})`
      : data.status === "CANCELED"
        ? `Sanction annulée pour ${after.playerName}`
        : `Sanction mise à jour pour ${after.playerName}`,
  })
  return ok(serialize(after))
}

/**
 * Suppression définitive d'une sanction.
 * DELETE /api/sport/sanctions/:id — réservée au responsable des sports de l'Amicale.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportSanction.findUnique({ where: { id } })
  if (!before) return err("Sanction introuvable", 404)

  await db.sportSanction.delete({ where: { id } })
  await audit({
    userId: gate.user.id,
    action: "DELETE",
    entity: "SportSanction",
    entityId: id,
    before,
    after: null,
    description: `Suppression de la sanction de ${before.playerName} (${cardTypeLabel(before.cardType)})`,
  })
  return ok({ deleted: true })
}
