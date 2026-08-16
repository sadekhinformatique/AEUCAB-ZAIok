import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const disciplineId = url.searchParams.get("disciplineId")
  const status = url.searchParams.get("status")

  const where: Record<string, unknown> = {}
  if (disciplineId) where.disciplineId = disciplineId
  if (status && status !== "ALL") where.status = status

  const teams = await db.sportTeam.findMany({
    where,
    orderBy: [{ className: "asc" }, { level: "asc" }],
    include: { discipline: true },
  })
  return ok(serialize(teams))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { disciplineId, className, level, name, captainName, players, status } = body
  if (!disciplineId) return err("La discipline est requise", 422)
  if (!className?.trim()) return err("La classe (filière) est requise", 422)

  const discipline = await db.sportDiscipline.findUnique({ where: { id: disciplineId } })
  if (!discipline) return err("Discipline introuvable", 404)

  const cls = className.trim()
  const lvl = (level ?? "").trim()
  const clash = await db.sportTeam.findUnique({
    where: { disciplineId_className_level: { disciplineId, className: cls, level: lvl } },
  })
  // Règlement art. 2 : une seule équipe par classe et par discipline
  if (clash) return err(`La classe « ${cls} » a déjà une équipe dans cette discipline`, 409)

  const team = await db.sportTeam.create({
    data: {
      disciplineId,
      className: cls,
      level: lvl,
      name: name?.trim() || `${cls} — ${discipline.name}`,
      captainName: captainName?.trim() || null,
      players: parsePlayers(players),
      status: status || "INSCRIPTION",
    },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "SportTeam",
    entityId: team.id,
    after: team,
    description: `Inscription équipe ${team.name} (${cls} · ${discipline.name})`,
  })
  return ok(serialize(team), 201)
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
