import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"
import { checkTeamRules, parseIdArray, stringifyIds, withTeamDetails, EXCEPTIONAL_CLASS } from "@/lib/sgiau/sport"
import { resolveUrlObjects } from "@/lib/storage"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const competitionId = url.searchParams.get("competitionId")
  const disciplineId = url.searchParams.get("disciplineId")
  const status = url.searchParams.get("status")
  const kind = url.searchParams.get("kind")
  const q = url.searchParams.get("q")?.trim()

  const where: Record<string, unknown> = {}
  if (competitionId && competitionId !== "ALL") where.competitionId = competitionId
  if (disciplineId && disciplineId !== "ALL") where.disciplineId = disciplineId
  if (status && status !== "ALL") where.status = status
  if (kind && kind !== "ALL") where.kind = kind
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { className: { contains: q } },
      { captainName: { contains: q } },
    ]
  }

  const teams = await db.sportTeam.findMany({
    where,
    orderBy: [{ status: "asc" }, { className: "asc" }, { level: "asc" }],
    include: {
      competition: { select: { id: true, name: true, status: true } },
      discipline: true,
      member: { select: { id: true, matricule: true, firstName: true, lastName: true } },
      delegate: { select: { id: true, matricule: true, firstName: true, lastName: true } },
    },
  })

  const detailed = await Promise.all(teams.map((t) => withTeamDetails(t)))
  return ok(serialize(detailed).map((t) => ({ ...t, attachments: resolveUrlObjects(t.attachments) })))
}

/**
 * Création d'équipe par le responsable des sports de l'Amicale uniquement.
 * - équipe de classe (CLASS) : pour une classe/niveau, joueurs étudiants de la base ;
 * - équipe exceptionnelle (EXCEPTIONAL) : participants exceptionnels (administration
 *   universitaire…) et/ou joueurs explicitement autorisés — réservée au RSA.
 * Les responsables sportifs de classe passent par l'espace membre
 * (/api/member-space/sport/teams).
 */
export async function POST(req: NextRequest) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const body = await req.json()
  const {
    competitionId, disciplineId, className, level, name,
    kind, captainId, captainName, playerIds, participantIds,
  } = body

  if (!competitionId) return err("La compétition est requise", 422)
  if (!disciplineId) return err("La discipline est requise", 422)

  const competition = await db.sportCompetition.findUnique({ where: { id: competitionId } })
  if (!competition) return err("Compétition introuvable", 404)
  if (competition.status === "CLOSED") return err("Compétition close", 409)

  const discipline = await db.sportDiscipline.findUnique({ where: { id: disciplineId } })
  if (!discipline) return err("Discipline introuvable", 404)
  const inCompetition = await db.sportCompetitionDiscipline.findUnique({
    where: { competitionId_disciplineId: { competitionId, disciplineId } },
  })
  if (!inCompetition) return err("Cette discipline n'est pas inscrite à la compétition", 422)

  const teamKind = kind === "EXCEPTIONAL" ? "EXCEPTIONAL" : "CLASS"
  const cls = teamKind === "EXCEPTIONAL" ? EXCEPTIONAL_CLASS : (className ?? "").trim()
  const lvl = teamKind === "EXCEPTIONAL" ? "" : (level ?? "").toString().trim()
  if (!cls) return err("La classe (filière) est requise", 422)

  const players = parseIdArray(playerIds)
  const participants = teamKind === "EXCEPTIONAL" ? parseIdArray(participantIds) : []

  const clash = await db.sportTeam.findUnique({
    where: { competitionId_disciplineId_className_level: { competitionId, disciplineId, className: cls, level: lvl } },
  })
  if (clash) {
    return err(
      teamKind === "EXCEPTIONAL"
        ? "Une équipe exceptionnelle existe déjà dans cette discipline"
        : `La classe « ${cls} » a déjà une équipe dans cette discipline`,
      409
    )
  }

  // Contrôles automatiques (composition) — sans exiger le nombre exact (brouillon)
  const ruleError = await checkTeamRules({
    team: { kind: teamKind, className: cls, level: lvl, players, participants },
    disciplineTeamSize: discipline.teamSize,
    competitionId,
    exactCount: false,
  })
  if (ruleError) return err(ruleError, 422)

  let captainNameValue: string | null = null
  if (captainId) {
    const captain = await db.member.findUnique({ where: { id: captainId } })
    if (captain) captainNameValue = `${captain.firstName} ${captain.lastName}`
  }
  if (typeof captainName === "string" && captainName.trim() && !captainNameValue) {
    captainNameValue = captainName.trim()
  }

  const team = await db.sportTeam.create({
    data: {
      competitionId,
      disciplineId,
      className: cls,
      level: lvl,
      name: name?.trim() || (teamKind === "EXCEPTIONAL" ? `${discipline.name} — Exceptionnelle` : `${cls} — ${discipline.name}`),
      kind: teamKind,
      captainId: captainId || null,
      captainName: captainNameValue,
      players: stringifyIds(players),
      participants: stringifyIds(participants),
      status: "DRAFT",
    },
  })
  await audit({
    userId: gate.user.id,
    action: "CREATE",
    entity: "SportTeam",
    entityId: team.id,
    after: team,
    description: `Création ${teamKind === "EXCEPTIONAL" ? "d'une équipe exceptionnelle" : `de l'équipe ${team.name} (${cls}${lvl ? ` ${lvl}` : ""})`} — ${competition.name}`,
  })
  const detailed = await withTeamDetails(team)
  return ok(serialize(detailed), 201)
}
