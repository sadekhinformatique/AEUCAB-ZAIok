import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, serialize } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const memberId = url.searchParams.get("memberId")
  if (!memberId) return err("memberId requis", 422)

  const receipts = await db.receipt.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: { payment: { include: { cotisationType: true } } },
    take: 100,
  })
  return ok(serialize(receipts))
}
