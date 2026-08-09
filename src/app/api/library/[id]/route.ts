import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resource = await db.libraryResource.findUnique({ where: { id } })
  if (!resource) return err("Ressource introuvable", 404)
  return ok(serialize(resource))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const before = await db.libraryResource.findUnique({ where: { id } })
  if (!before) return err("Ressource introuvable", 404)

  const allowed = ["title", "author", "category", "isbn", "fileUrl", "totalCopies", "available"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) {
      if (k === "totalCopies" || k === "available") data[k] = Number(body[k]) || 0
      else data[k] = body[k]
    }
  }

  const after = await db.libraryResource.update({ where: { id }, data })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "UPDATE", entity: "LibraryResource", entityId: id, before, after, description: `Mise à jour ressource ${before.title}` })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.libraryResource.findUnique({ where: { id } })
  if (!before) return err("Ressource introuvable", 404)
  await db.libraryResource.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "DELETE", entity: "LibraryResource", entityId: id, before, description: `Suppression ressource ${before.title}` })
  return ok({ ok: true })
}
