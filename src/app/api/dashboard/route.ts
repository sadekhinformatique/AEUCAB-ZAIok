import { db } from "@/lib/db"
import { ok } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET() {
  const [
    totalMembers,
    activeMembers,
    pendingMembers,
    suspendedMembers,
    totalPayments,
    partialPayments,
    totalReceipts,
    pendingExpenses,
    validatedExpenses,
    activities,
    upcomingMeetings,
    openElections,
    openVotes,
    unreadNotifs,
  ] = await Promise.all([
    db.member.count(),
    db.member.count({ where: { status: "ACTIVE" } }),
    db.member.count({ where: { status: "PENDING" } }),
    db.member.count({ where: { status: "SUSPENDED" } }),
    db.payment.count({ where: { status: "PAID" } }),
    db.payment.count({ where: { status: "PARTIAL" } }),
    db.receipt.count(),
    db.expense.count({ where: { status: "PENDING" } }),
    db.expense.count({ where: { status: "VALIDATED" } }),
    db.activity.count(),
    db.meeting.count({ where: { startDate: { gt: new Date() } } }),
    db.election.count({ where: { status: "OPEN" } }),
    db.vote.count({ where: { status: "OPEN" } }),
    db.notification.count({ where: { isRead: false } }),
  ])

  // Financials
  const payments = await db.payment.findMany({ where: { status: "PAID" }, select: { amountPaid: true, paymentDate: true } })
  const revenue = payments.reduce((s, p) => s + p.amountPaid, 0)

  const expenses = await db.expense.findMany({ where: { status: "VALIDATED" }, select: { amount: true, date: true } })
  const spend = expenses.reduce((s, e) => s + e.amount, 0)

  const cashAccounts = await db.cashAccount.findMany()
  const cashBalance = cashAccounts.reduce((s, c) => s + c.balance, 0)

  // Monthly series (last 8 months)
  const now = new Date()
  const months: { label: string; revenue: number; spend: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const mRev = payments
      .filter((p) => { const pd = new Date(p.paymentDate); return pd >= start && pd < end })
      .reduce((s, p) => s + p.amountPaid, 0)
    const mSpend = expenses
      .filter((e) => { const ed = new Date(e.date); return ed >= start && ed < end })
      .reduce((s, e) => s + e.amount, 0)
    months.push({ label: d.toLocaleDateString("fr-FR", { month: "short" }), revenue: mRev, spend: mSpend })
  }

  // Members by faculty
  const byFacultyRaw = await db.member.groupBy({ by: ["faculty"], _count: true, orderBy: { _count: { faculty: "desc" } } })
  const byFaculty = byFacultyRaw.map((f) => ({ name: f.faculty ?? "—", value: f._count }))

  // Payment modes distribution
  const byModeRaw = await db.payment.groupBy({ by: ["paymentMode"], _count: true })
  const byMode = byModeRaw.map((m) => ({ name: m.paymentMode, value: m._count }))

  // Recent payments
  const recentPayments = await db.payment.findMany({
    take: 6,
    orderBy: { paymentDate: "desc" },
    include: { member: true },
  })

  // Recent members
  const recentMembers = await db.member.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  })

  return ok({
    counts: {
      totalMembers, activeMembers, pendingMembers, suspendedMembers,
      totalPayments, partialPayments, totalReceipts,
      pendingExpenses, validatedExpenses,
      activities, upcomingMeetings, openElections, openVotes, unreadNotifs,
    },
    financials: { revenue, spend, balance: revenue - spend, cashBalance },
    months,
    byFaculty,
    byMode,
    recentPayments: recentPayments.map((p) => ({
      id: p.id, reference: p.reference, amount: p.amountPaid, mode: p.paymentMode,
      status: p.status, date: p.paymentDate,
      member: `${p.member.firstName} ${p.member.lastName}`,
      matricule: p.member.matricule,
    })),
    recentMembers: recentMembers.map((m) => ({
      id: m.id, matricule: m.matricule, name: `${m.firstName} ${m.lastName}`,
      faculty: m.faculty, status: m.status, createdAt: m.createdAt,
    })),
  })
}
