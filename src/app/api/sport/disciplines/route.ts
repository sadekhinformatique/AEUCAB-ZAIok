import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET() {
  const disciplines = await db.sportDiscipline.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { teams: true } } },
  })
  return ok(serialize(disciplines))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, teamSize, active } = body
  if (!name?.trim()) return err("Le nom de la discipline est requis", 422)

  const existing = await db.sportDiscipline.findUnique({ where: { name: name.trim() } })
  if (existing) return err("Cette discipline existe déjà", 409)

  const discipline = await db.sportDiscipline.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      teamSize: Math.max(1, Number(teamSize) || 5),
      active: active !== false,
    },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "SportDiscipline",
    entityId: discipline.id,
    after: discipline,
    description: `Création discipline sportive ${discipline.name}`,
  })
  return ok(serialize(discipline), 201)
}
