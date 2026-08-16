import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"
import { resolveStorageUrl } from "@/lib/storage"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const archive = await db.archive.findUnique({ where: { id } })
  if (!archive) return err("Archive introuvable", 404)
  return ok(serialize({ ...archive, fileUrl: resolveStorageUrl(archive.fileUrl) }))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const before = await db.archive.findUnique({ where: { id } })
  if (!before) return err("Archive introuvable", 404)

  const allowed = ["title", "year", "category", "description", "fileUrl", "protected"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) data[k] = body[k]
  }
  if ("year" in body) data.year = String(body.year)

  const after = await db.archive.update({ where: { id }, data })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "UPDATE", entity: "Archive", entityId: id, before, after, description: `Mise à jour archive ${before.title}` })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.archive.findUnique({ where: { id } })
  if (!before) return err("Archive introuvable", 404)
  if (before.protected) return err("Cette archive est protégée et ne peut être supprimée", 409)
  await db.archive.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "DELETE", entity: "Archive", entityId: id, before, description: `Suppression archive ${before.title}` })
  return ok({ ok: true })
}
