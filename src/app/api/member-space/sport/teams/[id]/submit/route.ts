import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId, resolveMemberId, notifyRole } from "@/lib/sgiau/api"
import { checkTeamRules, parseIdArray, withTeamDetails, getTeamPlayerPositions } from "@/lib/sgiau/sport"
import { SPORT_RESPONSABLE_ROLE } from "@/lib/sgiau/constants"

export const dynamic = "force-dynamic"

/**
 * Soumission de l'équipe par le responsable sportif de classe.
 * Le responsable de classe ne valide jamais lui-même : la demande part au
 * responsable des sports de l'Amicale (SUBMITTED). Les règles de la
 * compétition sont appliquées automatiquement avant l'envoi (nombre exact de
 * joueurs, appartenance à la classe, un joueur = une équipe).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  const { id } = await params
  const before = await db.sportTeam.findUnique({ where: { id }, include: { discipline: true } })
  if (!before || before.delegateId !== r.memberId) return err("Équipe introuvable", 404)
  if (before.status !== "DRAFT") {
    return err("Seule une équipe en brouillon peut être soumise", 409)
  }
  if (!before.competitionId) return err("Équipe sans compétition — données historiques", 409)
  const competition = await db.sportCompetition.findUnique({ where: { id: before.competitionId } })
  if (!competition || competition.status !== "OPEN") {
    return err("Les inscriptions ne sont pas ouvertes pour cette compétition", 409)
  }

  const players = parseIdArray(before.players)
  const positions = await getTeamPlayerPositions(id)
  const posMap = Object.fromEntries(
    [...positions.entries()].map(([pid, p]) => [pid, p.position ?? ""])
  )
  const ruleError = await checkTeamRules({
    team: { kind: "CLASS", className: before.className, level: before.level, players, participants: [], disciplineId: before.disciplineId },
    disciplineTeamSize: before.discipline.teamSize,
    minPlayers: before.discipline.minTeamSize,
    maxPlayers: before.discipline.maxTeamSize,
    competitionId: before.competitionId,
    teamId: id,
    positions: posMap,
    requirePositions: true,
  })
  if (ruleError) return err(ruleError, 422)

  const after = await db.sportTeam.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: new Date(), refusalReason: null },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "SUBMIT",
    entity: "SportTeam",
    entityId: id,
    before,
    after,
    description: `Soumission de l'équipe ${after.name} — en attente de validation du responsable des sports`,
  })
  // Le responsable des sports de l'Amicale reçoit la demande dans son interface
  await notifyRole({
    role: SPORT_RESPONSABLE_ROLE,
    title: "Nouvelle équipe soumise",
    message: `L'équipe « ${after.name} » (${after.className}${after.level ? ` ${after.level}` : ""}) attend votre validation.`,
    type: "SPORT",
  })
  const detailed = await withTeamDetails(after)
  return ok(serialize(detailed))
}
