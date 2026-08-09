import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, serialize } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const memberId = url.searchParams.get("memberId")
  if (!memberId) return err("memberId requis", 422)

  const member = await db.member.findUnique({
    where: { id: memberId },
    include: {
      card: true,
      adhesion: true,
      payments: { include: { cotisationType: true, receipt: true }, orderBy: { paymentDate: "desc" }, take: 50 },
      _count: { select: { payments: true, presences: true, activities: true, meetings: true } },
    },
  })
  if (!member) return err("Membre introuvable", 404)

  const totalPaid = member.payments.reduce((s, p) => s + p.amountPaid, 0)
  const totalDue = member.payments.reduce((s, p) => s + p.amount, 0)
  const lastPayment = member.payments[0] ?? null
  const hasCard = !!member.card

  // Recent requests
  const requests = await db.memberRequest.findMany({ where: { memberId }, orderBy: { createdAt: "desc" }, take: 20 })

  return ok(serialize({
    member,
    requests,
    stats: {
      totalPaid,
      totalDue,
      remaining: Math.max(0, totalDue - totalPaid),
      isUpToDate: totalDue === 0 || totalPaid >= totalDue,
      paymentsCount: member._count.payments,
      lastPaymentDate: lastPayment?.paymentDate ?? null,
      hasCard,
    },
  }))
}
