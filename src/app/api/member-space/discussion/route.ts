import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, serialize, resolveMemberId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

const MAX_MESSAGES = 200
const MAX_LENGTH = 1000

export async function GET() {
  const items = await db.discussionMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: MAX_MESSAGES,
    include: { member: { select: { id: true, firstName: true, lastName: true, matricule: true } } },
  })
  // Ordre de discussion (ancien → récent)
  return ok(serialize(items.reverse()))
}

export async function POST(req: NextRequest) {
  const r = await resolveMemberId(req)
  if (r.error) return err("Non authentifié", r.error)
  const memberId = r.memberId
  if (!memberId) return err("Compte non lié à un membre", 422)

  const body = await req.json().catch(() => ({}))
  const message = String(body.message ?? "").trim()
  if (!message) return err("Le message est vide", 422)
  if (message.length > MAX_LENGTH) return err(`Message trop long (${MAX_LENGTH} caractères max)`, 422)

  const item = await db.discussionMessage.create({
    data: { memberId, message },
    include: { member: { select: { id: true, firstName: true, lastName: true, matricule: true } } },
  })
  return ok(serialize(item), 201)
}
