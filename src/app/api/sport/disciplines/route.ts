import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"
import { parsePositionNames, syncDisciplinePositions } from "@/lib/sgiau/sport"

export const dynamic = "force-dynamic"

// La lecture reste accessible à tout utilisateur authentifié (l'espace membre
// affiche les disciplines) ; la gestion est réservée au responsable des sports.
export async function GET() {
  const disciplines = await db.sportDiscipline.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { teams: true } }, positions: { orderBy: { createdAt: "asc" } } },
  })
  return ok(serialize(disciplines))
}

export async function POST(req: NextRequest) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const body = await req.json()
  const { name, description, teamSize, minTeamSize, maxTeamSize, positions, active } = body
  if (!name?.trim()) return err("Le nom de la discipline est requis", 422)

  const existing = await db.sportDiscipline.findUnique({ where: { name: name.trim() } })
  if (existing) return err("Cette discipline existe déjà", 409)

  const size = Math.max(1, Number(teamSize) || 5)
  const min = minTeamSize !== undefined && minTeamSize !== null ? Math.max(1, Number(minTeamSize)) : null
  const max = maxTeamSize !== undefined && maxTeamSize !== null ? Math.max(1, Number(maxTeamSize)) : null
  if (min !== null && max !== null && min > max) {
    return err("Le nombre minimum de joueurs ne peut pas dépasser le maximum", 422)
  }

  const discipline = await db.$transaction(async (tx) => {
    const d = await tx.sportDiscipline.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        teamSize: size,
        minTeamSize: min,
        maxTeamSize: max,
        active: active !== false,
      },
    })
    await syncDisciplinePositions(tx, d.id, parsePositionNames(positions))
    return d
  })
  const userId = gate.user.id
  await audit({
    userId,
    action: "CREATE",
    entity: "SportDiscipline",
    entityId: discipline.id,
    after: discipline,
    description: `Création discipline sportive ${discipline.name}`,
  })
  const detailed = await db.sportDiscipline.findUnique({
    where: { id: discipline.id },
    include: { positions: { orderBy: { createdAt: "asc" } } },
  })
  return ok(serialize(detailed), 201)
}
