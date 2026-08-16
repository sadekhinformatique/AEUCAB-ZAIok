import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable, notifyMember } from "@/lib/sgiau/api"
import { checkTeamRules, parseIdArray, stringifyIds, withTeamDetails, TEAM_STATUSES, parseAttachments, stringifyAttachments } from "@/lib/sgiau/sport"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const team = await db.sportTeam.findUnique({
    where: { id },
    include: {
      competition: { select: { id: true, name: true, status: true } },
      discipline: true,
      member: { select: { id: true, matricule: true, firstName: true, lastName: true } },
      delegate: { select: { id: true, matricule: true, firstName: true, lastName: true } },
    },
  })
  if (!team) return err("Équipe introuvable", 404)
  const detailed = await withTeamDetails(team)
  return ok(serialize(detailed))
}

/**
 * Gestion d'une équipe — réservée au responsable des sports de l'Amicale.
 * La validation finale (VALIDATED) ne peut être faite que par lui.
 * Workflow : DRAFT → SUBMITTED → UNDER_REVIEW → VALIDATED | RETURNED | REJECTED.
 * Le responsable de classe est notifié à chaque décision.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportTeam.findUnique({
    where: { id },
    include: { discipline: true, competition: true },
  })
  if (!before) return err("Équipe introuvable", 404)
  if (!before.competitionId) return err("Équipe sans compétition — données historiques", 409)
  if (before.competition?.status === "CLOSED") return err("Compétition close", 409)

  const body = await req.json()
  const data: Record<string, unknown> = {}
  const players = parseIdArray(body.playerIds !== undefined ? body.playerIds : before.players)
  const participants =
    before.kind === "EXCEPTIONAL"
      ? parseIdArray(body.participantIds !== undefined ? body.participantIds : before.participants)
      : []

  // ——— Édition du contenu (sauf équipes validées) ———
  if (before.status !== "VALIDATED") {
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
    if (body.playerIds !== undefined) data.players = stringifyIds(players)
    if (before.kind === "EXCEPTIONAL" && body.participantIds !== undefined) {
      data.participants = stringifyIds(participants)
    }
    if (Array.isArray(body.attachments)) {
      data.attachments = stringifyAttachments(parseAttachments(body.attachments))
    }
    // Synchronisation des postes des joueurs (si fournis)
    if (body.playerIds !== undefined && body.positions && typeof body.positions === "object") {
      const posMap = Object.fromEntries(
        Object.entries(body.positions as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "").trim()])
      )
      await db.$transaction(async (tx) => {
        await tx.sportTeamPlayer.deleteMany({ where: { teamId: id } })
        if (players.length) {
          await tx.sportTeamPlayer.createMany({
            data: players.map((pid) => ({ teamId: id, memberId: pid, position: posMap[pid] || null, confirmed: true })),
          })
        }
      })
    }
    // Une équipe refusée ou retournée redevient un brouillon dès qu'elle est retravaillée
    if (["REJECTED", "RETURNED"].includes(before.status) && body.status === undefined) {
      data.status = "DRAFT"
      data.refusalReason = null
    }
  }

  // ——— Workflow de validation ———
  const target = body.status
  if (typeof target === "string" && TEAM_STATUSES.includes(target as (typeof TEAM_STATUSES)[number]) && target !== before.status) {
    const from = before.status
    const allowed: Record<string, string[]> = {
      UNDER_REVIEW: ["DRAFT", "SUBMITTED"],
      VALIDATED: ["DRAFT", "SUBMITTED", "UNDER_REVIEW"],
      RETURNED: ["SUBMITTED", "UNDER_REVIEW"],
      REJECTED: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED"],
      SUBMITTED: ["DRAFT"],
      DRAFT: ["REJECTED", "RETURNED"],
    }
    if (!(allowed[target] ?? []).includes(from)) {
      return err(`Transition de statut invalide : ${from} → ${target}`, 422)
    }

    if (target === "VALIDATED" || target === "SUBMITTED") {
      const ruleError = await checkTeamRules({
        team: { kind: before.kind, className: before.className, level: before.level, players, participants, disciplineId: before.disciplineId },
        disciplineTeamSize: before.discipline.teamSize,
        minPlayers: before.discipline.minTeamSize,
        maxPlayers: before.discipline.maxTeamSize,
        competitionId: before.competitionId,
        teamId: id,
        requirePositions: target === "SUBMITTED",
      })
      if (ruleError) return err(ruleError, 422)
    }
    if (target === "RETURNED" || target === "REJECTED") {
      const reason = (body.refusalReason ?? "").toString().trim()
      if (!reason) return err("Le motif (correction ou refus) est requis", 422)
      data.refusalReason = reason
    }

    data.status = target
    if (target === "VALIDATED") {
      data.validatedById = gate.user.id
      data.validatedAt = new Date()
    }
    if (target === "SUBMITTED") data.submittedAt = new Date()
  }

  if (Object.keys(data).length === 0) return ok(serialize(await withTeamDetails(before)))

  const after = await db.sportTeam.update({ where: { id }, data })
  await audit({
    userId: gate.user.id,
    action: data.status === "VALIDATED" ? "VALIDATE" : data.status === "REJECTED" ? "REJECT" : data.status === "RETURNED" ? "RETURN" : "UPDATE",
    entity: "SportTeam",
    entityId: id,
    before,
    after,
    description:
      data.status === "VALIDATED"
        ? `Validation finale de l'équipe « ${after.name} »`
        : data.status === "REJECTED"
          ? `Refus de l'équipe « ${after.name} » — motif : ${data.refusalReason}`
          : data.status === "RETURNED"
            ? `Équipe « ${after.name} » retournée pour correction — motif : ${data.refusalReason}`
            : `Mise à jour de l'équipe « ${after.name} »`,
  })

  // Notification au responsable sportif de classe
  if (after.delegateId) {
    const label =
      data.status === "VALIDATED" ? "validée 🎉" : data.status === "REJECTED" ? "refusée" : data.status === "RETURNED" ? "retournée pour correction" : "mise à jour"
    await notifyMember({
      memberId: after.delegateId,
      title: `Équipe « ${after.name} » ${label}`,
      message:
        data.status === "RETURNED"
          ? `Votre équipe doit être corrigée. Motif : ${data.refusalReason ?? "—"}. Corrigez puis soumettez à nouveau.`
          : data.status === "REJECTED"
            ? `Votre équipe a été refusée. Motif : ${data.refusalReason ?? "—"}.`
            : data.status === "VALIDATED"
              ? "Votre équipe est officiellement engagée dans la compétition."
              : `Le statut de votre équipe a changé (${after.status}).`,
      type: "SPORT",
    })
  }
  const detailed = await withTeamDetails(after)
  return ok(serialize(detailed))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportTeam.findUnique({ where: { id } })
  if (!before) return err("Équipe introuvable", 404)

  const matches = await db.sportMatch.count({
    where: { OR: [{ teamAId: id }, { teamBId: id }] },
  })
  if (matches > 0) {
    return err("Cette équipe est engagée dans des matchs — supprimez-les d'abord", 409)
  }

  await db.sportTeam.delete({ where: { id } })
  await audit({
    userId: gate.user.id,
    action: "DELETE",
    entity: "SportTeam",
    entityId: id,
    before,
    description: `Suppression de l'équipe « ${before.name} »`,
  })
  return ok({ ok: true })
}
