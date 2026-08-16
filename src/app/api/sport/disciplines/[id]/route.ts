import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"
import { parsePositionNames, syncDisciplinePositions } from "@/lib/sgiau/sport"

export const dynamic = "force-dynamic"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportDiscipline.findUnique({ where: { id } })
  if (!before) return err("Discipline introuvable", 404)

  const body = await req.json()
  if (typeof body.name === "string" && body.name.trim()) {
    const clash = await db.sportDiscipline.findFirst({
      where: { name: body.name.trim(), id: { not: id } },
    })
    if (clash) return err("Une autre discipline porte déjà ce nom", 409)
  }

  const data: Record<string, unknown> = {}
  if (typeof body.name === "string") data.name = body.name.trim()
  if (typeof body.description === "string") data.description = body.description.trim() || null
  if (body.teamSize !== undefined) data.teamSize = Math.max(1, Number(body.teamSize) || before.teamSize)
  const min = body.minTeamSize !== undefined && body.minTeamSize !== null ? Math.max(1, Number(body.minTeamSize)) : null
  const max = body.maxTeamSize !== undefined && body.maxTeamSize !== null ? Math.max(1, Number(body.maxTeamSize)) : null
  if (min !== null && max !== null && min > max) {
    return err("Le nombre minimum de joueurs ne peut pas dépasser le maximum", 422)
  }
  data.minTeamSize = min
  data.maxTeamSize = max
  if (body.yellowAccumulation !== undefined) {
    data.yellowAccumulation = Math.max(1, Number(body.yellowAccumulation) || before.yellowAccumulation)
  }
  if (typeof body.active === "boolean") data.active = body.active

  const after = await db.$transaction(async (tx) => {
    const d = await tx.sportDiscipline.update({ where: { id }, data })
    if (Array.isArray(body.positions)) {
      await syncDisciplinePositions(tx, id, parsePositionNames(body.positions))
    }
    return d
  })
  const userId = gate.user.id
  await audit({ userId, action: "UPDATE", entity: "SportDiscipline", entityId: id, before, after, description: `Mise à jour discipline ${after.name}` })
  const detailed = await db.sportDiscipline.findUnique({
    where: { id },
    include: { positions: { orderBy: { createdAt: "asc" } } },
  })
  return ok(serialize(detailed))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportDiscipline.findUnique({ where: { id } })
  if (!before) return err("Discipline introuvable", 404)

  const teams = await db.sportTeam.count({ where: { disciplineId: id } })
  if (teams > 0) {
    return err(`Impossible de supprimer : ${teams} équipe(s) sont inscrites dans cette discipline`, 409)
  }

  await db.sportDiscipline.delete({ where: { id } })
  const userId = gate.user.id
  await audit({ userId, action: "DELETE", entity: "SportDiscipline", entityId: id, before, description: `Suppression discipline ${before.name}` })
  return ok({ ok: true })
}
