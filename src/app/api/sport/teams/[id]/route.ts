import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

const STATUSES = ["INSCRIPTION", "CONFIRMED", "REJECTED"]

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.sportTeam.findUnique({ where: { id } })
  if (!before) return err("Équipe introuvable", 404)

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (typeof body.disciplineId === "string") {
    const discipline = await db.sportDiscipline.findUnique({ where: { id: body.disciplineId } })
    if (!discipline) return err("Discipline introuvable", 404)
    data.disciplineId = body.disciplineId
  }
  if (typeof body.className === "string") data.className = body.className.trim()
  if (typeof body.level === "string") data.level = body.level.trim()
  if (typeof body.name === "string") data.name = body.name.trim() || before.name
  if (typeof body.captainName === "string") data.captainName = body.captainName.trim() || null
  if (body.players !== undefined) data.players = parsePlayers(body.players)
  if (typeof body.status === "string" && STATUSES.includes(body.status)) data.status = body.status

  // Règlement art. 2 : une seule équipe par classe et par discipline
  if (data.disciplineId || data.className || data.level) {
    const disciplineId = (data.disciplineId as string) ?? before.disciplineId
    const className = (data.className as string) ?? before.className
    const level = (data.level as string) ?? before.level
    const clash = await db.sportTeam.findFirst({
      where: { disciplineId, className, level, id: { not: id } },
    })
    if (clash) return err(`La classe « ${className} » a déjà une équipe dans cette discipline`, 409)
  }

  const after = await db.sportTeam.update({ where: { id }, data })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "UPDATE", entity: "SportTeam", entityId: id, before, after, description: `Mise à jour équipe ${after.name}` })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.sportTeam.findUnique({ where: { id } })
  if (!before) return err("Équipe introuvable", 404)

  await db.sportTeam.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "DELETE", entity: "SportTeam", entityId: id, before, description: `Suppression équipe ${before.name}` })
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
