import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const partner = await db.partner.findUnique({ where: { id } })
  if (!partner) return err("Partenaire introuvable", 404)
  return ok(serialize(partner))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const before = await db.partner.findUnique({ where: { id } })
  if (!before) return err("Partenaire introuvable", 404)

  const allowed = ["name", "type", "contactName", "contactPhone", "contactEmail", "address", "contractUrl", "contribution", "note"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) {
      if (k === "contribution") data[k] = Number(body[k]) || 0
      else data[k] = body[k]
    }
  }
  if ("startDate" in body) data.startDate = body.startDate ? new Date(body.startDate) : null
  if ("endDate" in body) data.endDate = body.endDate ? new Date(body.endDate) : null

  const after = await db.partner.update({ where: { id }, data })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "UPDATE", entity: "Partner", entityId: id, before, after, description: `Mise à jour partenaire ${before.name}` })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.partner.findUnique({ where: { id } })
  if (!before) return err("Partenaire introuvable", 404)
  await db.partner.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "DELETE", entity: "Partner", entityId: id, before, description: `Suppression partenaire ${before.name}` })
  return ok({ ok: true })
}
