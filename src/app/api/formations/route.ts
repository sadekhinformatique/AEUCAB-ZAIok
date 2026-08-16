import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"
import { resolveStorageUrl } from "@/lib/storage"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { trainer: { contains: q } },
      { location: { contains: q } },
    ]
  }

  const items = await db.formation.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: { _count: { select: { participants: true } } },
    take: 500,
  })
  return ok(serialize(items).map((f) => ({ ...f, documentUrl: resolveStorageUrl(f.documentUrl) })))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, description, trainer, startDate, endDate, location, budget } = body
  if (!title || !title.trim()) return err("Le titre est requis", 422)
  if (!trainer || !trainer.trim()) return err("Le formateur est requis", 422)
  if (!startDate) return err("La date de début est requise", 422)

  const formation = await db.formation.create({
    data: {
      title: title.trim(),
      description: description || null,
      trainer: trainer.trim(),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      location: location || null,
      budget: Number(budget) || 0,
    },
    include: { _count: { select: { participants: true } } },
  })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "CREATE", entity: "Formation", entityId: formation.id, after: formation, description: `Création formation ${formation.title}` })
  return ok(serialize(formation), 201)
}
