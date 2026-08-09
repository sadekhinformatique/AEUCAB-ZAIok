import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { audience, audienceId, title, message, channel, type } = body
  if (!title || !message) return err("Titre et message requis", 422)
  if (!audience || !["user", "member"].includes(audience)) return err("Audience invalide (user ou member)", 422)
  if (!audienceId) return err("Destinataire requis", 422)

  const userId = await getCurrentUserId()
  const data: Record<string, unknown> = {
    title, message,
    channel: channel || "APP",
    type: type || "INFO",
    isRead: false,
  }

  if (audience === "user") data.userId = audienceId
  else data.memberId = audienceId

  const notif = await db.notification.create({ data: data as any })
  await audit({ userId, action: "CREATE", entity: "Notification", entityId: notif.id, after: serialize(notif), description: `Notification envoyée à ${audience} ${audienceId} via ${channel || "APP"}` })

  return ok(serialize(notif), 201)
}
