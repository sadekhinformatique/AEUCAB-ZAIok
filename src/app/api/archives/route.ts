import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const year = url.searchParams.get("year")
  const category = url.searchParams.get("category")

  const where: Record<string, unknown> = {}
  if (year && year !== "ALL") where.year = year
  if (category && category !== "ALL") where.category = category
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ]
  }

  const items = await db.archive.findMany({
    where,
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    take: 500,
  })
  return ok(serialize(items))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, year, category, description, fileUrl, protected: isProtected } = body
  if (!title || !title.trim()) return err("Le titre est requis", 422)
  if (!year) return err("L'année est requise", 422)

  const archive = await db.archive.create({
    data: {
      title: title.trim(),
      year: String(year),
      category: category || "DOCUMENT",
      description: description || null,
      fileUrl: fileUrl || null,
      protected: isProtected === true,
    },
  })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "CREATE", entity: "Archive", entityId: archive.id, after: archive, description: `Archivage « ${archive.title} » (${archive.year})` })
  return ok(serialize(archive), 201)
}
