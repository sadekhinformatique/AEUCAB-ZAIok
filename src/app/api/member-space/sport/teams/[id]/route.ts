import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId, resolveMemberId } from "@/lib/sgiau/api"
import { checkTeamRules, parseIdArray, stringifyIds, withTeamDetails, DELEGATE_EDITABLE_STATUSES } from "@/lib/sgiau/sport"

export const dynamic = "force-dynamic"

/**
 * Mise à jour d'un brouillon par le responsable sportif de classe propriétaire.
 * Une équipe refusée ou retournée pour correction peut être corrigée (elle
 * redevient un brouillon, le motif est effacé) puis soumise à nouveau.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  const { id } = await params
  const before = await db.sportTeam.findUnique({ where: { id }, include: { discipline: true } })
  if (!before || before.delegateId !== r.memberId) return err("Équipe introuvable", 404)
  if (!DELEGATE_EDITABLE_STATUSES.includes(before.status as (typeof DELEGATE_EDITABLE_STATUSES)[number])) {
    return err("Seule une équipe en brouillon, retournée ou refusée peut être modifiée", 409)
  }
  if (!before.competitionId) return err("Équipe sans compétition — données historiques", 409)
  const competition = await db.sportCompetition.findUnique({ where: { id: before.competitionId } })
  if (!competition || competition.status !== "OPEN") {
    return err("Les inscriptions ne sont pas ouvertes pour cette compétition", 409)
  }

  const body = await req.json()
  const players = parseIdArray(body.playerIds !== undefined ? body.playerIds : before.players)
  const posMap =
    body.positions && typeof body.positions === "object"
      ? Object.fromEntries(
          Object.entries(body.positions as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "").trim()])
        )
      : {}
  const ruleError = await checkTeamRules({
    team: { kind: "CLASS", className: before.className, level: before.level, players, participants: [], disciplineId: before.disciplineId },
    disciplineTeamSize: before.discipline.teamSize,
    minPlayers: before.discipline.minTeamSize,
    maxPlayers: before.discipline.maxTeamSize,
    competitionId: before.competitionId,
    teamId: id,
    positions: posMap,
    exactCount: false,
  })
  if (ruleError) return err(ruleError, 422)

  const data: Record<string, unknown> = {
    players: stringifyIds(players),
    // Une équipe refusée ou retournée redevient un brouillon pour correction
    ...(before.status === "REJECTED" || before.status === "RETURNED" ? { status: "DRAFT", refusalReason: null } : {}),
  }
  if (typeof body.name === "string") data.name = body.name.trim() || before.name
  if (typeof body.captainId === "string") {
    data.captainId = body.captainId || null
    if (body.captainId) {
      const captain = await db.member.findUnique({ where: { id: body.captainId } })
      data.captainName = captain ? `${captain.firstName} ${captain.lastName}` : before.captainName
    } else {
      data.captainName = null
    }
  }

  const after = await db.$transaction(async (tx) => {
    const updated = await tx.sportTeam.update({ where: { id }, data })
    await tx.sportTeamPlayer.deleteMany({ where: { teamId: id } })
    if (players.length) {
      await tx.sportTeamPlayer.createMany({
        data: players.map((pid) => ({
          teamId: id,
          memberId: pid,
          position: posMap[pid] || null,
          confirmed: true,
        })),
      })
    }
    return updated
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "UPDATE",
    entity: "SportTeam",
    entityId: id,
    before,
    after,
    description: `Correction de l'équipe ${after.name} par le responsable sportif de classe`,
  })
  const detailed = await withTeamDetails(after)
  return ok(serialize(detailed))
}
