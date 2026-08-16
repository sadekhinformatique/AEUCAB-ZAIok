import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId, resolveMemberId, notifyMember } from "@/lib/sgiau/api"
import { checkTeamRules, parseIdArray, stringifyIds } from "@/lib/sgiau/sport"

export const dynamic = "force-dynamic"

/**
 * Réponse à une demande de participation :
 * - direction STUDENT : le responsable sportif de classe accepte/refuse la
 *   demande de l'étudiant. Si acceptée, l'étudiant intègre la composition.
 * - direction DELEGATE : l'étudiant sélectionné accepte/refuse. Tant qu'il n'a
 *   pas accepté, il n'est pas considéré comme joueur confirmé.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  const { id } = await params
  const body = await req.json()
  const action = (body.action ?? "").toString().toUpperCase() // ACCEPT | REFUSE
  if (!["ACCEPT", "REFUSE"].includes(action)) return err("Action invalide (ACCEPT ou REFUSE)", 422)

  const request = await db.sportParticipationRequest.findUnique({
    where: { id },
    include: { competition: true, discipline: true },
  })
  if (!request) return err("Demande introuvable", 404)
  if (request.status !== "PENDING") return err("Cette demande a déjà été traitée", 409)

  if (request.direction === "STUDENT") {
    // Réponse du responsable sportif de classe
    if (request.delegateId !== r.memberId) return err("Seul le responsable sportif de la classe peut répondre", 403)
  } else {
    // Réponse de l'étudiant sélectionné
    if (request.memberId !== r.memberId) return err("Seul l'étudiant sélectionné peut répondre", 403)
  }

  const accepted = action === "ACCEPT"
  const response = body.response ? body.response.toString().trim().slice(0, 500) : null

  // ——— Intégration dans l'équipe du délégué (acceptation) ———
  if (accepted) {
    if (request.competition.status !== "OPEN") {
      return err("Les inscriptions sont closes pour cette compétition", 409)
    }
    const team = await getOrCreateTeam(request)
    if (!team) return err("Aucun responsable sportif actif pour cette classe", 409)
    const already = parseIdArray(team.players)
    if (!already.includes(request.memberId)) {
      // STUDENT : on vérifie que l'étudiant n'a pas déjà intégré une équipe entre-temps
      if (request.direction === "STUDENT") {
        const teams = await db.sportTeam.findMany({
          where: { competitionId: request.competitionId, status: { in: ["SUBMITTED", "UNDER_REVIEW", "VALIDATED"] } },
          select: { id: true, players: true },
        })
        for (const t of teams) {
          if (t.id !== team.id && parseIdArray(t.players).includes(request.memberId)) {
            return err("L'étudiant est déjà inscrit(e) dans une autre équipe de cette compétition", 409)
          }
        }
      }
      const addError = await addPlayerToTeam(team.id, request.memberId, request.position)
      if (addError) return err(addError, 422)
    }
  }

  const after = await db.sportParticipationRequest.update({
    where: { id },
    data: { status: accepted ? "ACCEPTED" : "REFUSED", response, respondedAt: new Date() },
  })

  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: accepted ? "VALIDATE" : "REJECT",
    entity: "SportParticipationRequest",
    entityId: id,
    after,
    description: `${request.direction === "STUDENT" ? "Réponse du responsable de classe" : "Réponse de l'étudiant"} : ${accepted ? "acceptée" : "refusée"}${response ? ` — ${response}` : ""}`,
  })

  // ——— Notifications ———
  const student = await db.member.findUnique({ where: { id: request.memberId } })
  const delegate = await db.member.findUnique({ where: { id: request.delegateId } })
  const who = student ? `${student.firstName} ${student.lastName}` : request.memberId
  if (request.direction === "STUDENT") {
    await notifyMember({
      memberId: request.memberId,
      title: accepted ? "Participation acceptée 🎉" : "Participation refusée",
      message: accepted
        ? `Le responsable sportif de votre classe a accepté votre demande (poste : ${request.position}).`
        : `Votre demande de participation (poste : ${request.position}) a été refusée${response ? ` — ${response}` : ""}.`,
      type: "SPORT",
    })
  } else {
    const dName = delegate ? `${delegate.firstName} ${delegate.lastName}` : "Le responsable sportif"
    await notifyMember({
      memberId: request.delegateId,
      title: accepted ? "Sélection acceptée 🎉" : "Sélection refusée",
      message: accepted
        ? `${who} a accepté votre sélection (poste : ${request.position}) et rejoint l'équipe.`
        : `${who} a refusé votre sélection${response ? ` — ${response}` : ""}. Vous pouvez sélectionner un autre joueur.`,
      type: "SPORT",
    })
  }

  return ok(serialize(after))
}

/** Trouve l'équipe du délégué pour la discipline, ou la crée (brouillon). */
async function getOrCreateTeam(request: { competitionId: string; disciplineId: string; delegateId: string; memberId: string }) {
  const delegate = await db.sportDelegate.findFirst({
    where: { competitionId: request.competitionId, memberId: request.delegateId, status: "ACTIVE" },
  })
  if (!delegate) return null

  let team = await db.sportTeam.findFirst({
    where: { competitionId: request.competitionId, disciplineId: request.disciplineId, delegateId: request.delegateId },
  })
  if (!team) {
    const discipline = await db.sportDiscipline.findUnique({ where: { id: request.disciplineId } })
    team = await db.sportTeam.create({
      data: {
        competitionId: request.competitionId,
        disciplineId: request.disciplineId,
        className: delegate.className,
        level: delegate.level,
        name: `${delegate.className} — ${discipline?.name ?? "Équipe"}`,
        kind: "CLASS",
        players: stringifyIds([request.memberId]),
        status: "DRAFT",
        delegateId: request.delegateId,
        memberId: request.delegateId,
      },
    })
  }
  return team
}

/** Ajoute un joueur à l'équipe (players JSON + poste SportTeamPlayer). Retourne une erreur ou null. */
async function addPlayerToTeam(teamId: string, memberId: string, position: string): Promise<string | null> {
  const team = await db.sportTeam.findUnique({ where: { id: teamId }, include: { discipline: true } })
  if (!team || !team.competitionId) return "Équipe introuvable"
  const players = parseIdArray(team.players)
  if (players.includes(memberId)) {
    // déjà présent — on met simplement à jour le poste
    await db.sportTeamPlayer.upsert({
      where: { teamId_memberId: { teamId, memberId } },
      create: { teamId, memberId, position, confirmed: true },
      update: { position, confirmed: true },
    })
    return null
  }
  const next = [...players, memberId]
  const ruleError = await checkTeamRules({
    team: { kind: "CLASS", className: team.className, level: team.level, players: next, participants: [], disciplineId: team.disciplineId },
    disciplineTeamSize: team.discipline.teamSize,
    minPlayers: team.discipline.minTeamSize,
    maxPlayers: team.discipline.maxTeamSize,
    competitionId: team.competitionId,
    teamId,
    positions: { [memberId]: position },
    exactCount: false,
  })
  if (ruleError) return ruleError
  await db.$transaction(async (tx) => {
    await tx.sportTeam.update({ where: { id: teamId }, data: { players: stringifyIds(next) } })
    await tx.sportTeamPlayer.upsert({
      where: { teamId_memberId: { teamId, memberId } },
      create: { teamId, memberId, position, confirmed: true },
      update: { position, confirmed: true },
    })
  })
  return null
}
