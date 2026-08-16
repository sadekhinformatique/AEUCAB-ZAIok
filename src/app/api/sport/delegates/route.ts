import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"
import { isAP } from "@/lib/sgiau/sport"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const competitionId = url.searchParams.get("competitionId")
  const where: Record<string, unknown> = {}
  if (competitionId) where.competitionId = competitionId

  const delegates = await db.sportDelegate.findMany({
    where,
    orderBy: [{ className: "asc" }, { level: "asc" }],
    include: {
      member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, level: true, status: true } },
      competition: { select: { id: true, name: true, status: true } },
    },
  })
  return ok(serialize(delegates))
}

/**
 * Désignation d'un responsable sportif de classe (RSA uniquement).
 * Le responsable est obligatoirement un étudiant existant, inscrit dans la
 * classe/niveau concerné (art. 2) — jamais une saisie manuelle.
 */
export async function POST(req: NextRequest) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const body = await req.json()
  const { competitionId, className, level, memberId } = body
  if (!competitionId) return err("La compétition est requise", 422)
  if (!className?.trim()) return err("La classe (filière) est requise", 422)
  if (!memberId) return err("Le membre à désigner est requis", 422)

  const competition = await db.sportCompetition.findUnique({ where: { id: competitionId } })
  if (!competition) return err("Compétition introuvable", 404)
  if (competition.status === "LAUNCHED" || competition.status === "CLOSED") {
    return err("Les responsables de classe se désignent avant le lancement de la compétition", 409)
  }

  const member = await db.member.findUnique({ where: { id: memberId } })
  if (!member) return err("Membre introuvable", 404)
  if (member.status !== "ACTIVE") return err("Seul un membre actif peut être désigné responsable sportif", 422)

  const cls = className.trim()
  const lvl = (level ?? "").toString().trim()
  const matchesClass = isAP(cls) ? !member.level : member.level === lvl
  if (member.faculty !== cls || !matchesClass) {
    return err(`${member.firstName} ${member.lastName} n'appartient pas à la classe ${cls}${lvl ? ` · ${lvl}` : ""}`, 422)
  }

  const clash = await db.sportDelegate.findUnique({
    where: { competitionId_className_level: { competitionId, className: cls, level: lvl } },
  })
  if (clash) {
    return err(`La classe ${cls}${lvl ? ` · ${lvl}` : ""} a déjà un responsable sportif désigné`, 409)
  }

  const delegate = await db.sportDelegate.create({
    data: {
      competitionId,
      className: cls,
      level: lvl,
      memberId,
      status: "PENDING",
      appointedById: gate.user.id,
    },
  })
  await audit({
    userId: gate.user.id,
    action: "CREATE",
    entity: "SportDelegate",
    entityId: delegate.id,
    after: delegate,
    description: `Désignation de ${member.firstName} ${member.lastName} (${member.matricule}) comme responsable sportif de ${cls}${lvl ? ` ${lvl}` : ""}`,
  })
  return ok(serialize(delegate), 201)
}
