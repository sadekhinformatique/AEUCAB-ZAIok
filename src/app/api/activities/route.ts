import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"
import { resolveUrlArray } from "@/lib/storage"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const status = url.searchParams.get("status")
  const type = url.searchParams.get("type")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500)

  const where: Record<string, unknown> = {}
  if (status && status !== "ALL") where.status = status
  if (type && type !== "ALL") where.type = type
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { location: { contains: q } },
      { description: { contains: q } },
    ]
  }

  const activities = await db.activity.findMany({
    where,
    orderBy: { startDate: "desc" },
    take: limit,
    include: {
      _count: { select: { participants: true, expenses: true, presences: true } },
    },
  })
  return ok(serialize(activities).map((a) => ({ ...a, photoUrls: resolveUrlArray(a.photoUrls) })))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, type, startDate, endDate, location, budget, description, status } = body
  if (!name?.trim()) return err("Le nom de l'activité est requis", 422)
  if (!startDate) return err("La date de début est requise", 422)

  const activity = await db.activity.create({
    data: {
      name: name.trim(),
      type: type || "EVENT",
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      location: location || null,
      budget: Number(budget) || 0,
      description: description || null,
      status: status || "PLANNED",
    },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "Activity",
    entityId: activity.id,
    after: activity,
    description: `Création activité ${activity.name}`,
  })
  return ok(serialize(activity), 201)
}
