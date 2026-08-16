import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

const PHASES = ["POOL", "QUARTER", "SEMI", "FINAL"]
const STATUSES = ["SCHEDULED", "PLAYED", "CANCELLED"]

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportMatch.findUnique({ where: { id } })
  if (!before) return err("Match introuvable", 404)

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (typeof body.teamAId === "string") data.teamAId = body.teamAId
  if (typeof body.teamBId === "string") data.teamBId = body.teamBId
  if (data.teamAId && data.teamAId === (data.teamBId ?? before.teamBId)) {
    return err("Une équipe ne peut pas jouer contre elle-même", 422)
  }
  if (typeof body.disciplineId === "string") {
    const discipline = await db.sportDiscipline.findUnique({ where: { id: body.disciplineId } })
    if (!discipline) return err("Discipline introuvable", 404)
    data.disciplineId = body.disciplineId
  }
  if (typeof body.date === "string") data.date = new Date(body.date)
  if (typeof body.location === "string") data.location = body.location.trim() || null
  if (typeof body.phase === "string" && PHASES.includes(body.phase)) data.phase = body.phase
  if (typeof body.status === "string" && STATUSES.includes(body.status)) data.status = body.status
  if (body.scoreA !== undefined) data.scoreA = body.scoreA === null || body.scoreA === "" ? null : Number(body.scoreA)
  if (body.scoreB !== undefined) data.scoreB = body.scoreB === null || body.scoreB === "" ? null : Number(body.scoreB)

  // Affectation / retrait de l'arbitre (gérée par le RSA uniquement)
  if (body.refereeId !== undefined) {
    if (!body.refereeId) {
      data.refereeId = null
    } else {
      const referee = await db.sportReferee.findUnique({ where: { id: body.refereeId } })
      if (!referee) return err("Arbitre introuvable", 404)
      if (referee.status !== "VALIDATED") return err("Seul un arbitre validé peut être affecté à un match", 422)
      data.refereeId = body.refereeId
    }
  }

  // Vérifie que les deux équipes appartiennent bien à la discipline du match
  const disciplineId = (data.disciplineId as string) ?? before.disciplineId
  const teamAId = (data.teamAId as string) ?? before.teamAId
  const teamBId = (data.teamBId as string) ?? before.teamBId
  const [teamA, teamB] = await Promise.all([
    db.sportTeam.findUnique({ where: { id: teamAId } }),
    db.sportTeam.findUnique({ where: { id: teamBId } }),
  ])
  if (!teamA || !teamB) return err("Équipe introuvable", 404)
  if (teamA.disciplineId !== disciplineId || teamB.disciplineId !== disciplineId) {
    return err("Les deux équipes doivent être inscrites dans la même discipline", 422)
  }
  if (data.refereeId !== undefined && data.refereeId) {
    const referee = await db.sportReferee.findUnique({ where: { id: data.refereeId as string } })
    if (referee && referee.competitionId !== teamA.competitionId) {
      return err("L'arbitre doit appartenir à la même compétition", 422)
    }
  }

  const after = await db.sportMatch.update({ where: { id }, data })
  await audit({
    userId: gate.user.id,
    action: "UPDATE",
    entity: "SportMatch",
    entityId: id,
    before,
    after,
    description: `Mise à jour du match ${teamA.name} vs ${teamB.name}`,
  })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportMatch.findUnique({ where: { id } })
  if (!before) return err("Match introuvable", 404)

  await db.sportMatch.delete({ where: { id } })
  await audit({
    userId: gate.user.id,
    action: "DELETE",
    entity: "SportMatch",
    entityId: id,
    before,
    description: `Suppression du match du ${before.date.toISOString()}`,
  })
  return ok({ ok: true })
}
