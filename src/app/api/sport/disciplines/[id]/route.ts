import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  if (typeof body.active === "boolean") data.active = body.active

  const after = await db.sportDiscipline.update({ where: { id }, data })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "UPDATE", entity: "SportDiscipline", entityId: id, before, after, description: `Mise à jour discipline ${after.name}` })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.sportDiscipline.findUnique({ where: { id } })
  if (!before) return err("Discipline introuvable", 404)

  const teams = await db.sportTeam.count({ where: { disciplineId: id } })
  if (teams > 0) {
    return err(`Impossible de supprimer : ${teams} équipe(s) sont inscrites dans cette discipline`, 409)
  }

  await db.sportDiscipline.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "DELETE", entity: "SportDiscipline", entityId: id, before, description: `Suppression discipline ${before.name}` })
  return ok({ ok: true })
}
