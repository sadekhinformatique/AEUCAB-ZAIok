import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const competitionId = url.searchParams.get("competitionId")
  const where: Record<string, unknown> = {}
  if (competitionId) where.competitionId = competitionId

  const referees = await db.sportReferee.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, level: true } },
      competition: { select: { id: true, name: true, status: true } },
    },
  })
  return ok(serialize(referees))
}

/**
 * Choix des arbitres — autorité exclusive du responsable des sports de l'Amicale.
 * Un arbitre peut être un membre existant (recommandé) ou une personne
 * enregistrée par son nom (décision du responsable des sports).
 */
export async function POST(req: NextRequest) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const body = await req.json()
  const { competitionId, memberId, fullName, note } = body
  if (!competitionId) return err("La compétition est requise", 422)

  const competition = await db.sportCompetition.findUnique({ where: { id: competitionId } })
  if (!competition) return err("Compétition introuvable", 404)
  if (competition.status === "CLOSED") return err("Compétition close", 409)

  let name = (fullName ?? "").trim()
  if (memberId) {
    const member = await db.member.findUnique({ where: { id: memberId } })
    if (!member) return err("Membre introuvable", 404)
    name = `${member.firstName} ${member.lastName}`
    const clash = await db.sportReferee.findUnique({
      where: { competitionId_memberId: { competitionId, memberId } },
    })
    if (clash) return err(`${name} est déjà arbitre de cette compétition`, 409)
  }
  if (!name) return err("Le nom de l'arbitre est requis", 422)

  const referee = await db.sportReferee.create({
    data: {
      competitionId,
      memberId: memberId || null,
      fullName: name,
      note: note?.trim() || null,
      status: "SELECTED",
    },
  })
  await audit({
    userId: gate.user.id,
    action: "CREATE",
    entity: "SportReferee",
    entityId: referee.id,
    after: referee,
    description: `Choix de l'arbitre ${name} pour ${competition.name}`,
  })
  return ok(serialize(referee), 201)
}
