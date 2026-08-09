import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

// GET — receipt detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const receipt = await db.receipt.findUnique({
    where: { id },
    include: {
      member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, level: true, department: true, academicYear: true, phone: true, email: true } },
      payment: { select: { id: true, reference: true, paymentMode: true, amount: true, amountPaid: true, paymentDate: true, note: true, cotisationType: { select: { name: true, kind: true } } } },
      cashier: { select: { id: true, fullName: true, role: true } },
    },
  })
  if (!receipt) return err("Reçu introuvable", 404)
  return ok(serialize(receipt))
}

// PATCH — cancel receipt (set cancelledAt + cancelReason)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { cancelReason } = body
  const userId = await getCurrentUserId()

  const before = await db.receipt.findUnique({ where: { id } })
  if (!before) return err("Reçu introuvable", 404)
  if (before.cancelledAt) return err("Ce reçu est déjà annulé", 409)

  const after = await db.receipt.update({
    where: { id },
    data: { cancelledAt: new Date(), cancelReason: cancelReason || "Annulation sans motif" },
  })

  await audit({ userId, action: "CANCEL", entity: "Receipt", entityId: id, before: serialize(before), after: serialize(after), description: `Reçu ${before.number} annulé` })
  return ok(serialize(after))
}
