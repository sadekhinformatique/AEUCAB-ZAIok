import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"
import { genReference } from "@/lib/sgiau/format"

export const dynamic = "force-dynamic"

// GET — list payments with filters
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const status = url.searchParams.get("status")
  const mode = url.searchParams.get("mode")
  const q = url.searchParams.get("q")?.trim()
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500)

  const where: Record<string, unknown> = {}
  if (status && status !== "ALL") where.status = status
  if (mode && mode !== "ALL") where.paymentMode = mode
  if (q) {
    where.OR = [
      { reference: { contains: q } },
      { note: { contains: q } },
      { member: { firstName: { contains: q } } },
      { member: { lastName: { contains: q } } },
      { member: { matricule: { contains: q } } },
    ]
  }

  const payments = await db.payment.findMany({
    where,
    orderBy: { paymentDate: "desc" },
    take: limit,
    include: {
      member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true, level: true } },
      cotisationType: { select: { id: true, name: true, kind: true, defaultAmount: true } },
      receipt: { select: { id: true, number: true, cancelledAt: true } },
    },
  })

  return ok(serialize(payments))
}

// POST — create payment (+ auto receipt + cash movement + ledger entries if PAID)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { memberId, cotisationTypeId, amount, amountPaid, paymentMode, paymentDate, note, cashierId } = body
  if (!memberId) return err("Le membre est requis", 422)
  if (!amount || Number(amount) <= 0) return err("Le montant est invalide", 422)

  const amt = Number(amount)
  const paid = Number(amountPaid ?? amount)
  let status: string = body.status
  if (!status) {
    status = paid >= amt ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING"
  }

  const userId = await getCurrentUserId()
  const reference = body.reference || genReference("PAY")

  // Resolve cash account based on mode
  const mode = (paymentMode || "CASH").toUpperCase()
  const cashAccounts = await db.cashAccount.findMany({ orderBy: { createdAt: "asc" } })
  const cashAcc =
    mode === "BANK" ? cashAccounts[1] ?? cashAccounts[0] :
    mode === "MOBILE" ? cashAccounts[2] ?? cashAccounts[0] :
    cashAccounts[0]
  if (!cashAcc) return err("Aucun compte de caisse configuré", 500)

  // Fiscal year (current = the open one, fallback latest)
  const fy = await db.fiscalYear.findFirst({ where: { closed: false }, orderBy: { startDate: "desc" } })
    ?? await db.fiscalYear.findFirst({ orderBy: { startDate: "desc" } })

  // Chart of accounts needed
  const acc51 = await db.account.findUnique({ where: { code: "51" } })
  const acc70 = await db.account.findUnique({ where: { code: "70" } })

  const payDate = paymentDate ? new Date(paymentDate) : new Date()

  // Create payment
  const payment = await db.payment.create({
    data: {
      reference,
      memberId,
      cotisationTypeId: cotisationTypeId || null,
      amount: amt,
      amountPaid: paid,
      paymentDate: payDate,
      paymentMode: mode,
      cashierId: cashierId || userId,
      status,
      note: note || null,
    },
  })

  // On PAID → generate receipt + cash movement IN + ledger entries
  if (status === "PAID") {
    // Receipt number REC-YYYY-NNNNN
    const year = payDate.getFullYear()
    const count = await db.receipt.count()
    const number = `REC-${year}-${String(count + 1).padStart(5, "0")}`

    await db.receipt.create({
      data: {
        number,
        paymentId: payment.id,
        memberId,
        amount: paid,
        cashierId: cashierId || userId,
        qrCode: payment.reference,
        createdAt: payDate,
      },
    })

    // Cash movement IN
    await db.cashMovement.create({
      data: {
        cashAccountId: cashAcc.id,
        type: "IN",
        amount: paid,
        label: `Cotisation — ${reference}`,
        date: payDate,
        refType: "PAYMENT",
        refId: payment.id,
        validated: true,
      },
    })
    await db.cashAccount.update({ where: { id: cashAcc.id }, data: { balance: { increment: paid } } })

    // Ledger entries (debit 51, credit 70)
    if (fy && acc51 && acc70) {
      await db.ledgerEntry.create({
        data: { fiscalYearId: fy.id, accountId: acc51.id, date: payDate, debit: paid, credit: 0, label: `Cotisation ${reference}`, refType: "PAYMENT", refId: payment.id },
      })
      await db.ledgerEntry.create({
        data: { fiscalYearId: fy.id, accountId: acc70.id, date: payDate, debit: 0, credit: paid, label: `Cotisation ${reference}`, refType: "PAYMENT", refId: payment.id },
      })
    }
  }

  await audit({ userId, action: "CREATE", entity: "Payment", entityId: payment.id, after: serialize(payment), description: `Paiement ${reference} (${status})` })

  const fresh = await db.payment.findUnique({
    where: { id: payment.id },
    include: {
      member: { select: { id: true, matricule: true, firstName: true, lastName: true } },
      cotisationType: true,
      receipt: true,
    },
  })
  return ok(serialize(fresh), 201)
}
