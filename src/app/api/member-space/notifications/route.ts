import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, serialize, resolveMemberId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

/** Notifications de l'application étudiante (par membre). */
export async function GET(req: NextRequest) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  const items = await db.notification.findMany({
    where: { memberId: r.memberId },
    orderBy: { sentAt: "desc" },
    take: 100,
  })
  return ok(serialize(items))
}

/** Marque toutes les notifications du membre comme lues. */
export async function POST(req: NextRequest) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  await db.notification.updateMany({
    where: { memberId: r.memberId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })
  return ok({ ok: true })
}
