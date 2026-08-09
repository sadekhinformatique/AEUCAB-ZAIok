import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

// GET borrows for a specific resource
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resource = await db.libraryResource.findUnique({ where: { id } })
  if (!resource) return err("Ressource introuvable", 404)
  const borrows = await db.libraryBorrow.findMany({
    where: { resourceId: id },
    include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true, phone: true, email: true } } },
    orderBy: { borrowedAt: "desc" },
  })
  return ok(serialize(borrows))
}

// POST: borrow a resource (decrement available)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { memberId, dueDate } = body
  if (!memberId) return err("Le membre est requis", 422)

  const resource = await db.libraryResource.findUnique({ where: { id } })
  if (!resource) return err("Ressource introuvable", 404)
  if (resource.available <= 0) return err("Aucun exemplaire disponible", 409)

  const member = await db.member.findUnique({ where: { id: memberId } })
  if (!member) return err("Membre introuvable", 404)

  const [updated, borrow] = await db.$transaction([
    db.libraryResource.update({ where: { id }, data: { available: { decrement: 1 } } }),
    db.libraryBorrow.create({
      data: {
        resourceId: id,
        memberId,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "BORROWED",
      },
      include: { member: true, resource: true },
    }),
  ])
  const userId = await getCurrentUserId()
  await audit({ userId, action: "CREATE", entity: "LibraryBorrow", entityId: borrow.id, after: borrow, description: `Emprunt de « ${resource.title} » par ${member.matricule} (restant: ${updated.available}/${updated.totalCopies})` })
  return ok(serialize(borrow), 201)
}
