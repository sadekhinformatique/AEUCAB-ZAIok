import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

const PHASES = ["POOL", "QUARTER", "SEMI", "FINAL"]
const STATUSES = ["SCHEDULED", "PLAYED", "CANCELLED"]

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const disciplineId = url.searchParams.get("disciplineId")
  const status = url.searchParams.get("status")
  const competitionId = url.searchParams.get("competitionId")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500)

  const where: Record<string, unknown> = {}
  if (disciplineId) where.disciplineId = disciplineId
  if (status && status !== "ALL") where.status = status
  if (competitionId && competitionId !== "ALL") where.teamA = { competitionId }

  const matches = await db.sportMatch.findMany({
    where,
    orderBy: { date: "asc" },
    take: limit,
    include: {
      discipline: true,
      teamA: true,
      teamB: true,
      referee: { select: { id: true, fullName: true, status: true } },
    },
  })
  return ok(serialize(matches))
}

/** Programmation des matchs — réservée au responsable des sports de l'Amicale. */
export async function POST(req: NextRequest) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const body = await req.json()
  const { disciplineId, teamAId, teamBId, date, location, phase, status, refereeId } = body
  if (!disciplineId) return err("La discipline est requise", 422)
  if (!teamAId || !teamBId) return err("Les deux équipes sont requises", 422)
  if (teamAId === teamBId) return err("Une équipe ne peut pas jouer contre elle-même", 422)
  if (!date) return err("La date du match est requise", 422)

  const discipline = await db.sportDiscipline.findUnique({ where: { id: disciplineId } })
  if (!discipline) return err("Discipline introuvable", 404)

  const teamA = await db.sportTeam.findUnique({ where: { id: teamAId } })
  const teamB = await db.sportTeam.findUnique({ where: { id: teamBId } })
  if (!teamA || !teamB) return err("Équipe introuvable", 404)
  if (teamA.disciplineId !== disciplineId || teamB.disciplineId !== disciplineId) {
    return err("Les deux équipes doivent être inscrites dans la même discipline", 422)
  }
  if (teamA.status !== "VALIDATED" || teamB.status !== "VALIDATED") {
    return err("Seules les équipes validées peuvent être programmées", 422)
  }
  if (teamA.competitionId !== teamB.competitionId) {
    return err("Les deux équipes doivent appartenir à la même compétition", 422)
  }

  // Affectation de l'arbitre (validation par le RSA)
  if (refereeId) {
    const referee = await db.sportReferee.findUnique({ where: { id: refereeId } })
    if (!referee) return err("Arbitre introuvable", 404)
    if (referee.status !== "VALIDATED") return err("Seul un arbitre validé peut être affecté à un match", 422)
    if (referee.competitionId !== teamA.competitionId) {
      return err("L'arbitre doit appartenir à la même compétition", 422)
    }
  }

  const match = await db.sportMatch.create({
    data: {
      disciplineId,
      teamAId,
      teamBId,
      refereeId: refereeId || null,
      date: new Date(date),
      location: location?.trim() || null,
      phase: PHASES.includes(phase) ? phase : "POOL",
      status: STATUSES.includes(status) ? status : "SCHEDULED",
    },
  })
  await audit({
    userId: gate.user.id,
    action: "CREATE",
    entity: "SportMatch",
    entityId: match.id,
    after: match,
    description: `Programmation du match ${teamA.name} vs ${teamB.name} (${discipline.name})`,
  })
  return ok(serialize(match), 201)
}
