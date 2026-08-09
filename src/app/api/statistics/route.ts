import { db } from "@/lib/db"
import { ok } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET() {
  const now = new Date()

  // Monthly revenue vs spend (12 months)
  const payments = await db.payment.findMany({ where: { status: { in: ["PAID", "PARTIAL"] } }, select: { amountPaid: true, amount: true, paymentDate: true } })
  const expenses = await db.expense.findMany({ where: { status: "VALIDATED" }, select: { amount: true, date: true, categoryId: true } })

  const months: { label: string; revenue: number; spend: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const revenue = payments
      .filter((p) => { const pd = new Date(p.paymentDate); return pd >= start && pd < end })
      .reduce((s, p) => s + p.amountPaid, 0)
    const spend = expenses
      .filter((e) => { const ed = new Date(e.date); return ed >= start && ed < end })
      .reduce((s, e) => s + e.amount, 0)
    months.push({ label: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }), revenue, spend })
  }

  // Members by faculty
  const byFacultyRaw = await db.member.groupBy({ by: ["faculty"], _count: true, orderBy: { _count: { faculty: "desc" } } })
  const byFaculty = byFacultyRaw.map((f) => ({ name: f.faculty ?? "—", value: f._count }))

  // Members by level
  const byLevelRaw = await db.member.groupBy({ by: ["level"], _count: true })
  const byLevel = byLevelRaw
    .map((l) => ({ name: l.level ?? "—", value: l._count }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Members by sex
  const bySexRaw = await db.member.groupBy({ by: ["sex"], _count: true })
  const bySex = bySexRaw.map((s) => ({ name: s.sex === "F" ? "Femmes" : "Hommes", value: s._count }))

  // Top 5 cotisants
  const topCotisantsRaw = await db.payment.groupBy({
    by: ["memberId"],
    _sum: { amountPaid: true },
    orderBy: { _sum: { amountPaid: "desc" } },
    take: 5,
  })
  const memberIds = topCotisantsRaw.map((t) => t.memberId)
  const members = await db.member.findMany({ where: { id: { in: memberIds } }, select: { id: true, firstName: true, lastName: true, matricule: true } })
  const topCotisants = topCotisantsRaw.map((t) => {
    const m = members.find((mm) => mm.id === t.memberId)
    return { name: m ? `${m.firstName} ${m.lastName}` : "—", matricule: m?.matricule ?? "—", value: t._sum.amountPaid ?? 0 }
  })

  // Recovery rate: total paid vs total due
  const totalDue = payments.reduce((s, p) => s + p.amount, 0)
  const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0)
  const recovery = {
    paid: totalPaid,
    due: totalDue,
    remaining: Math.max(0, totalDue - totalPaid),
    rate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 1000) / 10 : 0,
  }

  // Expenses by category
  const catIds = [...new Set(expenses.map((e) => e.categoryId).filter(Boolean))] as string[]
  const categories = await db.expenseCategory.findMany({ where: { id: { in: catIds } } })
  const catMap = new Map(categories.map((c) => [c.id, c.name]))
  const byCatMap = new Map<string, number>()
  for (const e of expenses) {
    const k = e.categoryId ? (catMap.get(e.categoryId) ?? "—") : "Non catégorisé"
    byCatMap.set(k, (byCatMap.get(k) ?? 0) + e.amount)
  }
  const expensesByCategory = Array.from(byCatMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return ok({
    months,
    byFaculty,
    byLevel,
    bySex,
    topCotisants,
    recovery,
    expensesByCategory,
    totals: {
      revenue: totalPaid,
      spend: expenses.reduce((s, e) => s + e.amount, 0),
      payments: payments.length,
      expenses: expenses.length,
    },
  })
}
