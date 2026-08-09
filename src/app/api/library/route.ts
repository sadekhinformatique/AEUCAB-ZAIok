import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const category = url.searchParams.get("category")

  const where: Record<string, unknown> = {}
  if (category && category !== "ALL") where.category = category
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { author: { contains: q } },
      { isbn: { contains: q } },
    ]
  }

  const items = await db.libraryResource.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { borrows: true } } },
    take: 500,
  })
  return ok(serialize(items))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, author, category, isbn, totalCopies } = body
  if (!title || !title.trim()) return err("Le titre est requis", 422)

  const copies = Number(totalCopies) || 1
  const resource = await db.libraryResource.create({
    data: {
      title: title.trim(),
      author: author || null,
      category: category || null,
      isbn: isbn || null,
      totalCopies: copies,
      available: copies,
    },
  })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "CREATE", entity: "LibraryResource", entityId: resource.id, after: resource, description: `Nouvelle ressource bibliothèque ${resource.title}` })
  return ok(serialize(resource), 201)
}
