import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireStaff, notifyAllMembers } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

/** Liste des publications (SAS et consultation). */
export async function GET(req: NextRequest) {
  const scope = new URL(req.url).searchParams.get("scope") // staff | members | all
  const where: Record<string, unknown> = {}
  if (scope === "staff") where.audience = "STAFF"
  if (scope === "members") where.audience = { in: ["ALL", "MEMBERS"] }
  const items = await db.announcement.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: 100,
  })
  return ok(serialize(items))
}

/** Publication depuis le SAS — diffusion vers l'application étudiante (sync API) + notification. */
export async function POST(req: NextRequest) {
  const gate = await requireStaff()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au personnel autorisé", gate.error)
  }

  const body = await req.json()
  const { title, body: content, audience, category, pinned, notify, publishedAt } = body
  if (!title?.trim() || !content?.trim()) return err("Titre et contenu requis", 422)

  const announcement = await db.announcement.create({
    data: {
      title: title.trim(),
      body: content.trim(),
      audience: audience && ["ALL", "MEMBERS", "STAFF"].includes(audience) ? audience : "ALL",
      category: category && ["GENERAL", "COTISATION", "SPORT", "ACTIVITY", "INFO"].includes(category) ? category : "GENERAL",
      imageUrl: body.imageUrl?.trim() || null,
      gallery: Array.isArray(body.gallery) && body.gallery.length ? JSON.stringify(body.gallery.map(String).map((s) => s.trim()).filter(Boolean)) : null,
      videoUrl: body.videoUrl?.trim() || null,
      fileUrl: body.fileUrl?.trim() || null,
      fileName: body.fileName?.trim() || null,
      linkUrl: body.linkUrl?.trim() || null,
      pinned: pinned === true,
      notify: notify === true,
      authorId: gate.user?.id ?? null,
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
    },
  })

  await audit({
    userId: gate.user?.id ?? null,
    action: "CREATE",
    entity: "Announcement",
    entityId: announcement.id,
    after: announcement,
    description: `Publication « ${announcement.title} » diffusée vers l'application étudiante`,
  })

  // Diffusion : SAS → publication → API → application → notification
  if (announcement.notify && announcement.audience !== "STAFF") {
    await notifyAllMembers({
      title: announcement.title,
      message: announcement.body.slice(0, 200),
      type: announcement.category === "SPORT" ? "SPORT" : announcement.category === "COTISATION" ? "PAYMENT" : "INFO",
    })
  }

  return ok(serialize(announcement), 201)
}
