import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

// GET — list receipts
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const memberId = url.searchParams.get("memberId")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500)

  const where: Record<string, unknown> = {}
  if (memberId) where.memberId = memberId
  if (q) {
    where.OR = [
      { number: { contains: q } },
      { member: { firstName: { contains: q } } },
      { member: { lastName: { contains: q } } },
      { member: { matricule: { contains: q } } },
    ]
  }

  const receipts = await db.receipt.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, level: true } },
      payment: { select: { id: true, reference: true, paymentMode: true, cotisationType: { select: { name: true } } } },
      cashier: { select: { id: true, fullName: true, role: true } },
    },
  })

  return ok(serialize(receipts))
}

// POST — create receipt for a paymentId (or create a payment inline if memberId+amount given)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { paymentId, memberId, amount, cashierId } = body
  const userId = await getCurrentUserId()

  let payment = paymentId ? await db.payment.findUnique({ where: { id: paymentId }, include: { receipt: true } }) : null

  // If no payment given, create one inline
  if (!payment && memberId && amount) {
    const amt = Number(amount)
    const ref = `PAY-${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.random().toString(36).toUpperCase().slice(2, 5)}`
    payment = await db.payment.create({
      data: {
        reference: ref,
        memberId,
        amount: amt,
        amountPaid: amt,
        paymentMode: body.paymentMode || "CASH",
        cashierId: cashierId || userId,
        status: "PAID",
        paymentDate: new Date(),
      },
      include: { receipt: true },
    })
  }

  if (!payment) return err("paymentId ou (memberId + amount) requis", 422)
  if (payment.receipt) return err("Ce paiement a déjà un reçu", 409)
  if (payment.status !== "PAID") return err("Le paiement doit être au statut PAID pour générer un reçu", 422)

  const year = new Date().getFullYear()
  const count = await db.receipt.count()
  const number = `REC-${year}-${String(count + 1).padStart(5, "0")}`

  const receipt = await db.receipt.create({
    data: {
      number,
      paymentId: payment.id,
      memberId: payment.memberId,
      amount: payment.amountPaid,
      cashierId: cashierId || userId,
      qrCode: payment.reference,
    },
    include: {
      member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, level: true } },
      payment: { select: { id: true, reference: true, paymentMode: true, cotisationType: { select: { name: true } } } },
      cashier: { select: { id: true, fullName: true, role: true } },
    },
  })

  await audit({ userId, action: "CREATE", entity: "Receipt", entityId: receipt.id, after: serialize(receipt), description: `Reçu ${number} émis` })
  return ok(serialize(receipt), 201)
}
