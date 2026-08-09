import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) return err("Document introuvable", 404)
  return ok(serialize(doc))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const before = await db.document.findUnique({ where: { id } })
  if (!before) return err("Document introuvable", 404)

  // Sign action
  if (body.action === "sign" || body.sign) {
    const userId = await getCurrentUserId()
    const user = await db.user.findUnique({ where: { id: userId } })
    const fullName = user?.fullName ?? "Signataire"
    const ts = Date.now()
    const signatureHash = simpleHash(`${before.title}|${ts}|${userId}`)
    const after = await db.document.update({
      where: { id },
      data: { signedBy: fullName, signedAt: new Date(ts), signatureHash },
    })
    await audit({ userId, action: "VALIDATE", entity: "Document", entityId: id, before, after, description: `Signature électronique du document ${before.title}` })
    return ok(serialize(after))
  }

  // Generic update
  const allowed = ["title", "description", "category", "visibility", "fileUrl", "fileType", "fileSize"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) data[k] = body[k]
  }
  if (typeof body.tags === "string") {
    const tagArray = body.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
    data.tags = JSON.stringify(tagArray)
  } else if (Array.isArray(body.tags)) {
    data.tags = JSON.stringify(body.tags)
  }

  const after = await db.document.update({ where: { id }, data })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "UPDATE", entity: "Document", entityId: id, before, after, description: `Mise à jour document ${before.title}` })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.document.findUnique({ where: { id } })
  if (!before) return err("Document introuvable", 404)
  await db.document.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "DELETE", entity: "Document", entityId: id, before, description: `Suppression document ${before.title}` })
  return ok({ ok: true })
}

function simpleHash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, "0")
}
