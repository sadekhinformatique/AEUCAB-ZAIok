import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const category = url.searchParams.get("category")
  const visibility = url.searchParams.get("visibility")

  const where: Record<string, unknown> = {}
  if (category && category !== "ALL") where.category = category
  if (visibility && visibility !== "ALL") where.visibility = visibility
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { signedBy: { contains: q } },
    ]
  }

  const docs = await db.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  })
  return ok(serialize(docs))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, description, category, visibility, tags, fileUrl, fileType, fileSize } = body
  if (!title || !title.trim()) return err("Le titre est requis", 422)

  const tagArray = Array.isArray(tags)
    ? tags
    : typeof tags === "string" && tags.trim()
      ? tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : null

  const doc = await db.document.create({
    data: {
      title: title.trim(),
      description: description ?? null,
      category: category || "GENERAL",
      visibility: visibility || "STAFF",
      fileUrl: fileUrl ?? null,
      fileType: fileType ?? null,
      fileSize: fileSize ?? null,
      tags: tagArray ? JSON.stringify(tagArray) : null,
    },
  })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "CREATE", entity: "Document", entityId: doc.id, after: doc, description: `Création document ${doc.title}` })
  return ok(serialize(doc), 201)
}
