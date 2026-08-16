import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, serialize, resolveMemberId } from "@/lib/sgiau/api"
import { withTeamDetails, getDisciplinePositions } from "@/lib/sgiau/sport"

export const dynamic = "force-dynamic"

/**
 * Espace membre — délégations du responsable sportif de classe.
 * Renvoie, pour le membre connecté : chaque classe/niveau dont il est
 * responsable, la compétition associée (avec disciplines), les étudiants
 * éligibles de sa classe (sélection uniquement dans la base) et son équipe.
 */
export async function GET(req: NextRequest) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  const delegations = await db.sportDelegate.findMany({
    where: { memberId: r.memberId },
    orderBy: { appointedAt: "desc" },
    include: {
      competition: {
        include: { disciplines: { include: { discipline: true } } },
      },
    },
  })

  // Postes configurés par discipline (pour la composition de l'équipe)
  const discIds = [...new Set(delegations.flatMap((d) => d.competition?.disciplines?.map((x: { disciplineId: string }) => x.disciplineId) ?? []))]
  const positionsByDisc = new Map<string, string[]>()
  for (const discId of discIds) positionsByDisc.set(discId, await getDisciplinePositions(discId))

  const pendingRequests = await db.sportParticipationRequest.findMany({
    where: { delegateId: r.memberId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      competition: { select: { id: true, name: true } },
      discipline: { select: { id: true, name: true } },
      member: { select: { id: true, firstName: true, lastName: true, matricule: true, faculty: true, level: true } },
    },
  })

  const out: Record<string, unknown>[] = []
  for (const d of delegations) {
    const team = await db.sportTeam.findFirst({
      where: { competitionId: d.competitionId, delegateId: r.memberId },
      include: { discipline: true },
    })
    const students = await db.member.findMany({
      where: {
        faculty: d.className,
        level: d.level || null,
        status: "ACTIVE",
      },
      select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, level: true },
      orderBy: { lastName: "asc" },
      take: 500,
    })
    out.push({
      id: d.id,
      competitionId: d.competitionId,
      className: d.className,
      level: d.level,
      status: d.status,
      competition: d.competition,
      positionsByDiscipline: Object.fromEntries([...positionsByDisc.entries()]),
      pendingRequests: pendingRequests.filter((p) => p.competitionId === d.competitionId),
      team: team ? await withTeamDetails(team) : null,
      students,
    })
  }

  return ok(serialize(out))
}
