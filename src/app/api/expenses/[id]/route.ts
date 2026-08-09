import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

// GET — expense detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const exp = await db.expense.findUnique({
    where: { id },
    include: {
      category: true,
      responsible: { select: { id: true, fullName: true, role: true } },
      validator: { select: { id: true, fullName: true, role: true } },
      fiscalYear: { select: { id: true, name: true } },
      activity: { select: { id: true, name: true } },
    },
  })
  if (!exp) return err("Dépense introuvable", 404)
  return ok(serialize(exp))
}

// PUT — update expense or change status
// When status becomes VALIDATED: create CashMovement OUT + 2 LedgerEntry (debit 60, credit 51) + decrement cash balance
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const userId = await getCurrentUserId()

  const before = await db.expense.findUnique({ where: { id } })
  if (!before) return err("Dépense introuvable", 404)

  const data: Record<string, unknown> = {}
  const allowed = ["label", "categoryId", "amount", "date", "responsibleId", "activityId", "note"]
  for (const k of allowed) {
    if (k in body) {
      if (k === "date") data[k] = body[k] ? new Date(body[k]) : null
      else if (k === "amount") data[k] = Number(body[k])
      else data[k] = body[k]
    }
  }

  // Status change
  const newStatus = body.status
  if (newStatus && newStatus !== before.status) {
    if (newStatus === "VALIDATED") {
      data.status = "VALIDATED"
      data.validatorId = userId
    } else if (newStatus === "REJECTED") {
      data.status = "REJECTED"
      data.validatorId = userId
    } else if (newStatus === "PENDING") {
      data.status = "PENDING"
    }
  }

  const after = await db.expense.update({ where: { id }, data })

  // If status changed to VALIDATED → cash movement OUT + ledger entries
  if (newStatus === "VALIDATED" && before.status !== "VALIDATED") {
    const cashMain = await db.cashAccount.findFirst({ orderBy: { createdAt: "asc" } })
    if (cashMain) {
      await db.cashMovement.create({
        data: {
          cashAccountId: cashMain.id,
          type: "OUT",
          amount: after.amount,
          label: `Dépense — ${after.label}`,
          date: after.date,
          refType: "EXPENSE",
          refId: after.id,
          validated: true,
        },
      })
      await db.cashAccount.update({ where: { id: cashMain.id }, data: { balance: { increment: -after.amount } } })
    }

    const [acc60, acc51] = await Promise.all([
      db.account.findUnique({ where: { code: "60" } }),
      db.account.findUnique({ where: { code: "51" } }),
    ])
    const fy = after.fiscalYearId
      ? await db.fiscalYear.findUnique({ where: { id: after.fiscalYearId } })
      : await db.fiscalYear.findFirst({ where: { closed: false }, orderBy: { startDate: "desc" } })

    if (acc60 && acc51 && fy) {
      await db.ledgerEntry.create({
        data: { fiscalYearId: fy.id, accountId: acc60.id, date: after.date, debit: after.amount, credit: 0, label: after.label, refType: "EXPENSE", refId: after.id },
      })
      await db.ledgerEntry.create({
        data: { fiscalYearId: fy.id, accountId: acc51.id, date: after.date, debit: 0, credit: after.amount, label: after.label, refType: "EXPENSE", refId: after.id },
      })
    }
  }

  await audit({
    userId,
    action: newStatus === "VALIDATED" ? "VALIDATE" : newStatus === "REJECTED" ? "REJECT" : "UPDATE",
    entity: "Expense",
    entityId: id,
    before: serialize(before),
    after: serialize(after),
    description: `Dépense ${before.reference} → ${after.status}`,
  })

  return ok(serialize(after))
}
