import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireStaff, notifyAllMembers } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireStaff()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au personnel autorisé", gate.error)
  }

  const { id } = await params
  const before = await db.announcement.findUnique({ where: { id } })
  if (!before) return err("Publication introuvable", 404)

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof body.title === "string") data.title = body.title.trim() || before.title
  if (typeof body.body === "string") data.body = body.body.trim() || before.body
  if (typeof body.audience === "string" && ["ALL", "MEMBERS", "STAFF"].includes(body.audience)) data.audience = body.audience
  if (typeof body.category === "string" && ["GENERAL", "COTISATION", "SPORT", "ACTIVITY", "INFO"].includes(body.category)) data.category = body.category
  if (typeof body.imageUrl === "string") data.imageUrl = body.imageUrl.trim() || null
  if (Array.isArray(body.gallery)) data.gallery = body.gallery.length ? JSON.stringify(body.gallery.map(String).map((s) => s.trim()).filter(Boolean)) : null
  if (typeof body.videoUrl === "string") data.videoUrl = body.videoUrl.trim() || null
  if (typeof body.fileUrl === "string") data.fileUrl = body.fileUrl.trim() || null
  if (typeof body.fileName === "string") data.fileName = body.fileName.trim() || null
  if (typeof body.linkUrl === "string") data.linkUrl = body.linkUrl.trim() || null
  if (typeof body.pinned === "boolean") data.pinned = body.pinned
  if (typeof body.notify === "boolean") data.notify = body.notify
  if (typeof body.publishedAt === "string") data.publishedAt = new Date(body.publishedAt)

  const after = await db.announcement.update({ where: { id }, data })
  await audit({
    userId: gate.user?.id ?? null,
    action: "UPDATE",
    entity: "Announcement",
    entityId: id,
    before,
    after,
    description: `Mise à jour de la publication « ${after.title} »`,
  })

  if (after.notify && after.audience !== "STAFF") {
    await notifyAllMembers({
      title: after.title,
      message: after.body.slice(0, 200),
      type: after.category === "SPORT" ? "SPORT" : after.category === "COTISATION" ? "PAYMENT" : "INFO",
    })
  }

  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireStaff()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au personnel autorisé", gate.error)
  }

  const { id } = await params
  const before = await db.announcement.findUnique({ where: { id } })
  if (!before) return err("Publication introuvable", 404)

  await db.announcement.delete({ where: { id } })
  await audit({
    userId: gate.user?.id ?? null,
    action: "DELETE",
    entity: "Announcement",
    entityId: id,
    before,
    description: `Suppression de la publication « ${before.title} »`,
  })
  return ok({ ok: true })
}
