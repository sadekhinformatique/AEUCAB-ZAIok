import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

/**
 * Lancement officiel de la compétition — réservé au responsable des sports.
 * Prérequis : inscriptions ouvertes, au moins une discipline, et au moins
 * deux équipes validées (un match oppose deux équipes).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const competition = await db.sportCompetition.findUnique({ where: { id } })
  if (!competition) return err("Compétition introuvable", 404)
  if (competition.status !== "OPEN") {
    return err("Seule une compétition dont les inscriptions sont ouvertes peut être lancée", 409)
  }

  const disciplineCount = await db.sportCompetitionDiscipline.count({ where: { competitionId: id } })
  if (disciplineCount === 0) {
    return err("Ajoutez au moins une discipline avant de lancer la compétition", 422)
  }
  const validatedTeams = await db.sportTeam.count({
    where: { competitionId: id, status: "VALIDATED" },
  })
  if (validatedTeams < 2) {
    return err(`Il faut au moins 2 équipes validées pour lancer la compétition — actuellement ${validatedTeams}`, 422)
  }

  const after = await db.sportCompetition.update({
    where: { id },
    data: { status: "LAUNCHED", launchedAt: new Date() },
  })
  await audit({
    userId: gate.user.id,
    action: "VALIDATE",
    entity: "SportCompetition",
    entityId: id,
    before: competition,
    after,
    description: `Lancement officiel de la compétition ${competition.name}`,
  })
  return ok(serialize(after))
}
