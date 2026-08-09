import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"
import { genReference } from "@/lib/sgiau/format"

export const dynamic = "force-dynamic"

// GET — list expenses
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const status = url.searchParams.get("status")
  const categoryId = url.searchParams.get("categoryId")
  const q = url.searchParams.get("q")?.trim()
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500)

  const where: Record<string, unknown> = {}
  if (status && status !== "ALL") where.status = status
  if (categoryId && categoryId !== "ALL") where.categoryId = categoryId
  if (q) {
    where.OR = [
      { reference: { contains: q } },
      { label: { contains: q } },
      { note: { contains: q } },
    ]
  }

  const [expenses, categories] = await Promise.all([
    db.expense.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
      include: {
        category: { select: { id: true, name: true } },
        responsible: { select: { id: true, fullName: true, role: true } },
        validator: { select: { id: true, fullName: true, role: true } },
        fiscalYear: { select: { id: true, name: true } },
        activity: { select: { id: true, name: true } },
      },
    }),
    db.expenseCategory.findMany({ orderBy: { name: "asc" } }),
  ])

  return ok(serialize({ expenses, categories }))
}

// POST — create expense
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { label, categoryId, amount, date, responsibleId, note, activityId } = body
  if (!label) return err("Le libellé est requis", 422)
  if (!amount || Number(amount) <= 0) return err("Le montant est invalide", 422)

  const userId = await getCurrentUserId()
  const amt = Number(amount)
  const count = await db.expense.count()
  const reference = body.reference || `EXP-${String(count + 1).padStart(4, "0")}`

  const fy = await db.fiscalYear.findFirst({ where: { closed: false }, orderBy: { startDate: "desc" } })

  const exp = await db.expense.create({
    data: {
      reference,
      label,
      categoryId: categoryId || null,
      amount: amt,
      date: date ? new Date(date) : new Date(),
      responsibleId: responsibleId || userId,
      status: "PENDING",
      fiscalYearId: fy?.id || null,
      activityId: activityId || null,
      note: note || null,
    },
    include: {
      category: true,
      responsible: { select: { id: true, fullName: true } },
    },
  })

  await audit({ userId, action: "CREATE", entity: "Expense", entityId: exp.id, after: serialize(exp), description: `Dépense ${reference} créée` })
  return ok(serialize(exp), 201)
}
