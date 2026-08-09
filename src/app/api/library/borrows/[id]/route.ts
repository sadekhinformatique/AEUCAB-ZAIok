import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

// PUT: return a borrowed resource (increment available, set returnedAt + status RETURNED)
export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.libraryBorrow.findUnique({ where: { id }, include: { resource: true } })
  if (!before) return err("Emprunt introuvable", 404)
  if (before.status === "RETURNED") return err("Cet emprunt est déjà retourné", 409)

  const [updatedResource, after] = await db.$transaction([
    db.libraryResource.update({ where: { id: before.resourceId }, data: { available: { increment: 1 } } }),
    db.libraryBorrow.update({ where: { id }, data: { status: "RETURNED", returnedAt: new Date() }, include: { member: true, resource: true } }),
  ])
  const userId = await getCurrentUserId()
  await audit({ userId, action: "UPDATE", entity: "LibraryBorrow", entityId: id, before, after, description: `Retour de « ${updatedResource.title} » (dispo: ${updatedResource.available}/${updatedResource.totalCopies})` })
  return ok(serialize(after))
}
