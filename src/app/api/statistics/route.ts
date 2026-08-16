import { db } from "@/lib/db"
import { ok } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET() {
  const now = new Date()
  const seriesStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  // Monthly revenue vs spend (12 months, bounded to the window)
  const [seriesPayments, seriesExpenses] = await Promise.all([
    db.payment.findMany({ where: { status: { in: ["PAID", "PARTIAL"] }, paymentDate: { gte: seriesStart } }, select: { amountPaid: true, paymentDate: true } }),
    db.expense.findMany({ where: { status: "VALIDATED", date: { gte: seriesStart } }, select: { amount: true, date: true } }),
  ])

  // All-time totals — computed in SQL, no full-table transfer
  const [paymentTotals, expenseTotals, byCatRaw] = await Promise.all([
    db.payment.aggregate({ where: { status: { in: ["PAID", "PARTIAL"] } }, _sum: { amount: true, amountPaid: true }, _count: true }),
    db.expense.aggregate({ where: { status: "VALIDATED" }, _sum: { amount: true }, _count: true }),
    db.expense.groupBy({ by: ["categoryId"], where: { status: "VALIDATED" }, _sum: { amount: true } }),
  ])

  const months: { label: string; revenue: number; spend: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const revenue = seriesPayments
      .filter((p) => { const pd = new Date(p.paymentDate); return pd >= start && pd < end })
      .reduce((s, p) => s + p.amountPaid, 0)
    const spend = seriesExpenses
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

  // Recovery rate: total paid vs total due (all-time, SQL)
  const totalDue = paymentTotals._sum.amount ?? 0
  const totalPaid = paymentTotals._sum.amountPaid ?? 0
  const recovery = {
    paid: totalPaid,
    due: totalDue,
    remaining: Math.max(0, totalDue - totalPaid),
    rate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 1000) / 10 : 0,
  }

  // Expenses by category (SQL groupBy)
  const catIds = [...new Set(byCatRaw.map((e) => e.categoryId).filter(Boolean))] as string[]
  const categories = await db.expenseCategory.findMany({ where: { id: { in: catIds } } })
  const catMap = new Map(categories.map((c) => [c.id, c.name]))
  const byCatMap = new Map<string, number>()
  for (const e of byCatRaw) {
    const k = e.categoryId ? (catMap.get(e.categoryId) ?? "—") : "Non catégorisé"
    byCatMap.set(k, (byCatMap.get(k) ?? 0) + (e._sum.amount ?? 0))
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
      spend: expenseTotals._sum.amount ?? 0,
      payments: paymentTotals._count,
      expenses: expenseTotals._count,
    },
  })
}
