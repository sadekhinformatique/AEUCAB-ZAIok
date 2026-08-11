import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, serialize, resolveMemberId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  if (!r.memberId) return err("memberId requis", 422)

  const receipts = await db.receipt.findMany({
    where: { memberId: r.memberId },
    orderBy: { createdAt: "desc" },
    include: { payment: { include: { cotisationType: true } } },
    take: 100,
  })
  return ok(serialize(receipts))
}
