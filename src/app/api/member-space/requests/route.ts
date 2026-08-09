import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const memberId = url.searchParams.get("memberId")
  if (!memberId) return err("memberId requis", 422)
  const items = await db.memberRequest.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return ok(serialize(items))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { memberId, type, subject, body: messageBody } = body
  if (!memberId || !type || !subject) return err("Champs manquants", 422)

  const userId = await getCurrentUserId()
  const item = await db.memberRequest.create({
    data: {
      memberId,
      type,
      subject,
      body: messageBody || null,
      status: "PENDING",
    },
  })
  await audit({ userId, action: "CREATE", entity: "MemberRequest", entityId: item.id, after: serialize(item), description: `Nouvelle demande membre: ${type} — ${subject}` })
  return ok(serialize(item), 201)
}
