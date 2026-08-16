import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId, resolveMemberId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

/**
 * Espace membre — inscription des équipes à la compétition inter-classes.
 * Le membre dépose son équipe (classe = sa propre filière/niveau, art. 2 du
 * règlement) ; le bureau la valide ou la rejette depuis le module Sport.
 */
export async function GET(req: NextRequest) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  const teams = await db.sportTeam.findMany({
    where: { memberId: r.memberId },
    orderBy: { createdAt: "desc" },
    include: { discipline: true },
  })
  return ok(serialize(teams))
}

export async function POST(req: NextRequest) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  const body = await req.json()
  const memberId = r.memberId ?? body.memberId
  if (!memberId) return err("memberId requis", 422)

  const { disciplineId, name, captainName, players } = body
  if (!disciplineId) return err("La discipline est requise", 422)

  const member = await db.member.findUnique({ where: { id: memberId } })
  if (!member) return err("Membre introuvable", 404)
  // Règlement art. 2 : l'équipe représente la classe du membre (filière + niveau)
  if (!member.faculty) {
    return err("Votre dossier ne contient pas de filière — contactez le bureau pour inscrire votre équipe", 422)
  }
  const className = member.faculty
  const level = member.level ?? ""

  const discipline = await db.sportDiscipline.findUnique({ where: { id: disciplineId } })
  if (!discipline) return err("Discipline introuvable", 404)
  if (!discipline.active) return err("Cette discipline n'est pas ouverte à l'inscription", 422)

  const clash = await db.sportTeam.findUnique({
    where: { disciplineId_className_level: { disciplineId, className, level } },
  })
  if (clash) {
    return err(`La classe « ${className} » a déjà une équipe dans cette discipline`, 409)
  }

  const team = await db.sportTeam.create({
    data: {
      disciplineId,
      className,
      level,
      name: name?.trim() || `${className} — ${discipline.name}`,
      captainName: captainName?.trim() || `${member.firstName} ${member.lastName}`,
      players: parsePlayers(players),
      status: "INSCRIPTION",
      memberId,
    },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "SportTeam",
    entityId: team.id,
    after: team,
    description: `Inscription équipe ${team.name} déposée par ${member.firstName} ${member.lastName} (${member.matricule})`,
  })
  return ok(serialize(team), 201)
}

export async function DELETE(req: NextRequest) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return err("id requis", 422)

  const team = await db.sportTeam.findUnique({ where: { id } })
  if (!team || team.memberId !== r.memberId) return err("Équipe introuvable", 404)
  // Un membre ne peut retirer que sa propre équipe tant qu'elle est en attente
  if (team.status !== "INSCRIPTION") {
    return err("Impossible de retirer une équipe déjà traitée par le bureau", 409)
  }

  await db.sportTeam.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "DELETE", entity: "SportTeam", entityId: id, before: team, description: `Retrait de l'équipe ${team.name} par le membre` })
  return ok({ ok: true })
}

function parsePlayers(value: unknown): string | null {
  if (Array.isArray(value)) {
    const arr = value.map(String).map((s) => s.trim()).filter(Boolean)
    return arr.length ? JSON.stringify(arr) : null
  }
  if (typeof value === "string") {
    const arr = value.split("\n").map((s) => s.trim()).filter(Boolean)
    return arr.length ? JSON.stringify(arr) : null
  }
  return null
}
