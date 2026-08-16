import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId, resolveMemberId, notifyRole } from "@/lib/sgiau/api"
import { checkTeamRules, parseIdArray, stringifyIds, withTeamDetails } from "@/lib/sgiau/sport"
import { SPORT_RESPONSABLE_ROLE } from "@/lib/sgiau/constants"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  const teams = await db.sportTeam.findMany({
    where: { delegateId: r.memberId },
    orderBy: { createdAt: "desc" },
    include: {
      competition: { select: { id: true, name: true, status: true } },
      discipline: true,
    },
  })
  const detailed = await Promise.all(teams.map((t) => withTeamDetails(t)))
  return ok(serialize(detailed))
}

/**
 * Création d'un brouillon d'équipe — réservée au responsable sportif de
 * classe désigné et actif. La classe/niveau de l'équipe vient de la
 * délégation (jamais du corps de la requête) : impossible d'inscrire une
 * autre classe. Les joueurs sont sélectionnés uniquement parmi les étudiants
 * existants de la base (aucune saisie manuelle).
 */
export async function POST(req: NextRequest) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  const body = await req.json()
  const { competitionId, disciplineId, name, captainId, playerIds, positions } = body
  if (!competitionId) return err("La compétition est requise", 422)
  if (!disciplineId) return err("La discipline est requise", 422)

  const delegate = await db.sportDelegate.findFirst({
    where: { competitionId, memberId: r.memberId, status: "ACTIVE" },
  })
  if (!delegate) {
    return err("Vous n'êtes pas responsable sportif désigné pour cette compétition", 403)
  }

  const competition = await db.sportCompetition.findUnique({ where: { id: competitionId } })
  if (!competition) return err("Compétition introuvable", 404)
  if (competition.status !== "OPEN") {
    return err("Les inscriptions ne sont pas ouvertes pour cette compétition", 409)
  }

  const discipline = await db.sportDiscipline.findUnique({ where: { id: disciplineId } })
  if (!discipline) return err("Discipline introuvable", 404)
  const inCompetition = await db.sportCompetitionDiscipline.findUnique({
    where: { competitionId_disciplineId: { competitionId, disciplineId } },
  })
  if (!inCompetition) return err("Cette discipline n'est pas proposée dans la compétition", 422)

  const cls = delegate.className
  const lvl = delegate.level
  const clash = await db.sportTeam.findUnique({
    where: { competitionId_disciplineId_className_level: { competitionId, disciplineId, className: cls, level: lvl } },
  })
  if (clash) return err(`La classe « ${cls} » a déjà une équipe dans cette discipline`, 409)

  const players = parseIdArray(playerIds)
  const posMap =
    positions && typeof positions === "object"
      ? Object.fromEntries(
          Object.entries(positions as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "").trim()])
        )
      : {}
  const ruleError = await checkTeamRules({
    team: { kind: "CLASS", className: cls, level: lvl, players, participants: [], disciplineId },
    disciplineTeamSize: discipline.teamSize,
    minPlayers: discipline.minTeamSize,
    maxPlayers: discipline.maxTeamSize,
    competitionId,
    positions: posMap,
    exactCount: false,
  })
  if (ruleError) return err(ruleError, 422)

  let captainName: string | null = null
  if (captainId) {
    const captain = await db.member.findUnique({ where: { id: captainId } })
    if (captain) captainName = `${captain.firstName} ${captain.lastName}`
  }

  const team = await db.$transaction(async (tx) => {
    const t = await tx.sportTeam.create({
      data: {
        competitionId,
        disciplineId,
        className: cls,
        level: lvl,
        name: name?.trim() || `${cls} — ${discipline.name}`,
        kind: "CLASS",
        captainId: captainId || null,
        captainName,
        players: stringifyIds(players),
        status: "DRAFT",
        delegateId: r.memberId,
        memberId: r.memberId,
      },
    })
    if (players.length) {
      await tx.sportTeamPlayer.createMany({
        data: players.map((pid) => ({
          teamId: t.id,
          memberId: pid,
          position: posMap[pid] || null,
          confirmed: true,
        })),
      })
    }
    return t
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "SportTeam",
    entityId: team.id,
    after: team,
    description: `Brouillon d'équipe ${team.name} (${cls}${lvl ? ` ${lvl}` : ""}) créé par le responsable sportif de classe`,
  })
  const detailed = await withTeamDetails(team)
  return ok(serialize(detailed), 201)
}

export async function DELETE(req: NextRequest) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return err("id requis", 422)

  const team = await db.sportTeam.findUnique({ where: { id } })
  if (!team || team.delegateId !== r.memberId) return err("Équipe introuvable", 404)
  if (team.status === "VALIDATED") {
    return err("Une équipe validée ne peut plus être retirée par le responsable de classe", 409)
  }
  const competition = team.competitionId ? await db.sportCompetition.findUnique({ where: { id: team.competitionId } }) : null
  if (competition && competition.status !== "OPEN") {
    return err("Les inscriptions sont closes pour cette compétition", 409)
  }

  await db.sportTeam.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "DELETE",
    entity: "SportTeam",
    entityId: id,
    before: team,
    description: `Retrait de l'équipe ${team.name} par le responsable sportif de classe`,
  })
  return ok({ ok: true })
}
