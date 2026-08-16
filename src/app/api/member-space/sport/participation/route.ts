import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId, resolveMemberId, notifyMember } from "@/lib/sgiau/api"
import { parseIdArray, getDisciplinePositions, ACTIVE_TEAM_STATUSES } from "@/lib/sgiau/sport"

export const dynamic = "force-dynamic"

/**
 * Espace membre — demandes de participation sportive.
 * GET : mes demandes (étudiant) + demandes reçues (responsable de classe).
 * POST : un étudiant demande à rejoindre l'équipe de sa classe (poste obligatoire).
 * La demande part automatiquement vers le responsable sportif de sa classe — jamais
 * directement au responsable des sports de l'Amicale.
 */
export async function GET(req: NextRequest) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  const [mine, received] = await Promise.all([
    db.sportParticipationRequest.findMany({
      where: { memberId: r.memberId },
      orderBy: { createdAt: "desc" },
      include: {
        competition: { select: { id: true, name: true, status: true } },
        discipline: { select: { id: true, name: true, teamSize: true } },
        delegate: { select: { id: true, firstName: true, lastName: true } },
        member: { select: { id: true, firstName: true, lastName: true, matricule: true, faculty: true, level: true } },
      },
    }),
    db.sportParticipationRequest.findMany({
      where: { delegateId: r.memberId },
      orderBy: { createdAt: "desc" },
      include: {
        competition: { select: { id: true, name: true, status: true } },
        discipline: { select: { id: true, name: true, teamSize: true } },
        delegate: { select: { id: true, firstName: true, lastName: true } },
        member: { select: { id: true, firstName: true, lastName: true, matricule: true, faculty: true, level: true } },
      },
    }),
  ])
  return ok(serialize({ mine, received }))
}

export async function POST(req: NextRequest) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  const body = await req.json()
  const { competitionId, disciplineId, position, note, direction } = body
  if (!competitionId) return err("La compétition est requise", 422)
  if (!disciplineId) return err("La discipline est requise", 422)
  const pos = (position ?? "").toString().trim()
  if (!pos) return err("Le poste est obligatoire — indiquez le poste que vous souhaitez jouer", 422)

  const competition = await db.sportCompetition.findUnique({ where: { id: competitionId } })
  if (!competition) return err("Compétition introuvable", 404)
  if (competition.status !== "OPEN") return err("Les inscriptions ne sont pas ouvertes pour cette compétition", 409)

  const inComp = await db.sportCompetitionDiscipline.findUnique({
    where: { competitionId_disciplineId: { competitionId, disciplineId } },
  })
  if (!inComp) return err("Cette discipline n'est pas proposée dans la compétition", 422)

  // Poste conforme aux postes configurés de la discipline
  const positions = await getDisciplinePositions(disciplineId)
  if (positions.length && !positions.includes(pos)) {
    return err(`Le poste « ${pos} » n'existe pas dans cette discipline (postes : ${positions.join(", ")})`, 422)
  }

  const isDelegateSelection = direction === "DELEGATE"
  if (isDelegateSelection) {
    // ——— Sélection directe par le responsable sportif de classe ———
    const delegate = await db.sportDelegate.findFirst({
      where: { competitionId, memberId: r.memberId, status: "ACTIVE" },
    })
    if (!delegate) return err("Vous n'êtes pas responsable sportif actif pour cette compétition", 403)

    const targetId = (body.memberId ?? "").toString()
    const student = await db.member.findUnique({ where: { id: targetId } })
    if (!student) return err("Étudiant introuvable", 404)
    if (student.status !== "ACTIVE") return err("Cet étudiant n'est pas actif", 409)
    // L'étudiant doit appartenir à la classe/niveau du délégué
    const levelOk = (student.level ?? "") === delegate.level
    if (student.faculty !== delegate.className || !levelOk) {
      return err(`${student.firstName} ${student.lastName} n'est pas inscrit(e) dans votre classe (${delegate.className}${delegate.level ? ` ${delegate.level}` : ""})`, 422)
    }

    const dup = await db.sportParticipationRequest.findFirst({
      where: { memberId: targetId, competitionId, disciplineId, status: "PENDING" },
    })
    if (dup) return err("Cet étudiant a déjà une demande en attente pour cette discipline", 409)

    const request = await db.sportParticipationRequest.create({
      data: {
        competitionId,
        disciplineId,
        memberId: targetId,
        delegateId: delegate.id,
        position: pos,
        direction: "DELEGATE",
        status: "PENDING",
        note: note ? note.toString().trim().slice(0, 500) : null,
      },
    })

    const userId = await getCurrentUserId()
    await audit({
      userId,
      action: "CREATE",
      entity: "SportParticipationRequest",
      entityId: request.id,
      after: request,
      description: `Sélection directe de ${student.firstName} ${student.lastName} (${pos}) par le responsable sportif de classe`,
    })

    // Notification à l'étudiant sélectionné
    await notifyMember({
      memberId: targetId,
      title: "Tu as été sélectionné 🏆",
      message: `Tu as été sélectionné(e) pour rejoindre l'équipe de ta classe (${competition.name}, poste : ${pos}). Accepte ou refuse la sélection.`,
      type: "SPORT",
    })

    const detailed = await db.sportParticipationRequest.findUnique({
      where: { id: request.id },
      include: {
        competition: { select: { id: true, name: true, status: true } },
        discipline: { select: { id: true, name: true, teamSize: true } },
        delegate: { select: { id: true, firstName: true, lastName: true } },
        member: { select: { id: true, firstName: true, lastName: true, matricule: true, faculty: true, level: true } },
      },
    })
    return ok(serialize(detailed), 201)
  }

  // ——— Demande d'un étudiant → responsable sportif de sa classe ———
  const student = await db.member.findUnique({ where: { id: r.memberId } })
  if (!student) return err("Membre introuvable", 404)
  if (student.status !== "ACTIVE") return err("Votre compte n'est pas actif", 403)

  // Le responsable sportif de la classe de l'étudiant reçoit la demande
  const delegate = await db.sportDelegate.findFirst({
    where: {
      competitionId,
      status: "ACTIVE",
      className: student.faculty ?? "",
      level: student.level ?? "",
    },
  })
  if (!delegate) {
    return err("Aucun responsable sportif désigné pour votre classe dans cette compétition", 409)
  }

  // Déjà inscrit dans une équipe active de cette compétition ?
  const activeTeams = await db.sportTeam.findMany({
    where: { competitionId, status: { in: ACTIVE_TEAM_STATUSES as unknown as string[] } },
    select: { id: true, players: true },
  })
  for (const t of activeTeams) {
    if (parseIdArray(t.players).includes(r.memberId)) {
      return err("Vous êtes déjà inscrit(e) dans une équipe de cette compétition", 409)
    }
  }

  // Pas de doublon de demande en attente pour la même discipline
  const dup = await db.sportParticipationRequest.findFirst({
    where: { memberId: r.memberId, competitionId, disciplineId, status: "PENDING" },
  })
  if (dup) return err("Vous avez déjà une demande en attente pour cette discipline", 409)

  const request = await db.sportParticipationRequest.create({
    data: {
      competitionId,
      disciplineId,
      memberId: r.memberId,
      delegateId: delegate.id,
      position: pos,
      direction: "STUDENT",
      status: "PENDING",
      note: note ? note.toString().trim().slice(0, 500) : null,
    },
  })

  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "SportParticipationRequest",
    entityId: request.id,
    after: request,
    description: `Demande de participation de ${student.firstName} ${student.lastName} (${pos}) envoyée au responsable sportif de sa classe`,
  })

  // Notification au responsable sportif de classe
  await notifyMember({
    memberId: delegate.id,
    title: "Nouvelle demande de participation",
    message: `${student.firstName} ${student.lastName} souhaite jouer au poste « ${pos} » dans ${competition.name}.`,
    type: "SPORT",
  })

  const detailed = await db.sportParticipationRequest.findUnique({
    where: { id: request.id },
    include: {
      competition: { select: { id: true, name: true, status: true } },
      discipline: { select: { id: true, name: true, teamSize: true } },
      delegate: { select: { id: true, firstName: true, lastName: true } },
      member: { select: { id: true, firstName: true, lastName: true, matricule: true, faculty: true, level: true } },
    },
  })
  return ok(serialize(detailed), 201)
}
