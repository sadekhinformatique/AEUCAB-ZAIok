import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

const PHASES = ["POOL", "QUARTER", "SEMI", "FINAL"]
const STATUSES = ["SCHEDULED", "PLAYED", "CANCELLED"]

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const disciplineId = url.searchParams.get("disciplineId")
  const status = url.searchParams.get("status")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500)

  const where: Record<string, unknown> = {}
  if (disciplineId) where.disciplineId = disciplineId
  if (status && status !== "ALL") where.status = status

  const matches = await db.sportMatch.findMany({
    where,
    orderBy: { date: "asc" },
    take: limit,
    include: {
      discipline: true,
      teamA: true,
      teamB: true,
    },
  })
  return ok(serialize(matches))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { disciplineId, teamAId, teamBId, date, location, phase, status } = body
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

  const match = await db.sportMatch.create({
    data: {
      disciplineId,
      teamAId,
      teamBId,
      date: new Date(date),
      location: location?.trim() || null,
      phase: PHASES.includes(phase) ? phase : "POOL",
      status: STATUSES.includes(status) ? status : "SCHEDULED",
    },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "SportMatch",
    entityId: match.id,
    after: match,
    description: `Programmation du match ${teamA.name} vs ${teamB.name} (${discipline.name})`,
  })
  return ok(serialize(match), 201)
}
