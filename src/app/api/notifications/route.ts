import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const unreadOnly = url.searchParams.get("unread") === "1"
  const where = unreadOnly ? { isRead: false } : {}
  const [items, count] = await Promise.all([
    db.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
    db.notification.count({ where }),
  ])
  return ok({ items, count })
}

export async function PATCH(req: NextRequest) {
  const { id, all } = await req.json().catch(() => ({}))
  if (all) {
    await db.notification.updateMany({ where: { isRead: false }, data: { isRead: true, readAt: new Date() } })
    return ok({ ok: true })
  }
  if (id) {
    await db.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } })
    return ok({ ok: true })
  }
  return ok({ ok: false })
}
