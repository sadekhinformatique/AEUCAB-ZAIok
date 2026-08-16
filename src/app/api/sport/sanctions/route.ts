import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"
import { SANCTION_CARD_TYPES, SANCTION_STATUSES, cardTypeLabel, normalizeCard } from "@/lib/sgiau/sport"

export const dynamic = "force-dynamic"

/** Filtres partagés (lecture par les équipes et par le SAS). */
function parseWhere(url: URL) {
  const competitionId = url.searchParams.get("competitionId")
  const disciplineId = url.searchParams.get("disciplineId")
  const teamId = url.searchParams.get("teamId")
  const status = url.searchParams.get("status")
  const memberId = url.searchParams.get("memberId")

  const where: Record<string, unknown> = {}
  if (competitionId && competitionId !== "ALL") where.competitionId = competitionId
  if (disciplineId && disciplineId !== "ALL") where.disciplineId = disciplineId
  if (teamId && teamId !== "ALL") where.teamId = teamId
  if (status && status !== "ALL") where.status = status
  if (memberId) where.memberId = memberId
  return where
}

/**
 * Liste des sanctions/suspensions.
 * GET /api/sport/sanctions — lecture publique (app étudiante) et SAS.
 * Les suspensions actives sont exposées aux équipes concernées.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const sanctions = await db.sportSanction.findMany({
    where: parseWhere(url),
    orderBy: [{ createdAt: "desc" }, { status: "asc" }],
    include: {
      team: { select: { id: true, name: true, className: true, level: true } },
      competition: { select: { id: true, name: true } },
      discipline: { select: { id: true, name: true } },
      match: { select: { id: true, date: true, phase: true } },
    },
  })
  return ok(serialize(sanctions))
}

/**
 * Création d'une sanction par le responsable des sports de l'Amicale.
 * POST /api/sport/sanctions — réservée au RSA (équipes exceptionnelles, discipline).
 */
export async function POST(req: NextRequest) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const body = await req.json()
  const { competitionId, disciplineId, teamId, playerName, memberId, cardType, matchesSuspended, reason, status } = body

  if (!competitionId) return err("La compétition est requise", 422)
  if (!disciplineId) return err("La discipline est requise", 422)
  if (!playerName || !String(playerName).trim()) return err("Le nom du joueur est requis", 422)

  const competition = await db.sportCompetition.findUnique({ where: { id: competitionId } })
  if (!competition) return err("Compétition introuvable", 404)
  const discipline = await db.sportDiscipline.findUnique({ where: { id: disciplineId } })
  if (!discipline) return err("Discipline introuvable", 404)

  let team: { id: string; competitionId: string | null; disciplineId: string; name: string } | null = null
  if (teamId) {
    team = await db.sportTeam.findUnique({
      where: { id: teamId },
      select: { id: true, competitionId: true, disciplineId: true, name: true },
    })
    if (!team) return err("Équipe introuvable", 404)
    if (team.competitionId !== competitionId || team.disciplineId !== disciplineId) {
      return err("L'équipe doit appartenir à cette compétition et à cette discipline", 422)
    }
  }
  if (memberId) {
    const member = await db.member.findUnique({ where: { id: memberId }, select: { id: true } })
    if (!member) return err("Membre introuvable", 404)
  }

  const type = normalizeCard(cardType)
  if (!(SANCTION_CARD_TYPES as readonly string[]).includes(type)) {
    return err("Type de carton invalide", 422)
  }
  const suspended = Math.max(0, Number(matchesSuspended) || 0)
  const finalStatus = (SANCTION_STATUSES as readonly string[]).includes(status) ? status : "ACTIVE"

  const sanction = await db.sportSanction.create({
    data: {
      competitionId,
      disciplineId,
      teamId: teamId || null,
      playerName: String(playerName).trim(),
      memberId: memberId || null,
      cardType: type,
      matchesSuspended: suspended,
      reason: reason ? String(reason) : null,
      status: finalStatus,
    },
  })
  await audit({
    userId: gate.user.id,
    action: "CREATE",
    entity: "SportSanction",
    entityId: sanction.id,
    before: null,
    after: sanction,
    description: `Sanction « ${cardTypeLabel(type)} » pour ${sanction.playerName}${team ? ` (${team.name})` : ""}${suspended ? ` — ${suspended} match(s)` : ""}`,
  })
  return ok(serialize(sanction))
}
