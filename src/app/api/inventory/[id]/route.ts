import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await db.inventoryItem.findUnique({ where: { id } })
  if (!item) return err("Bien introuvable", 404)
  return ok(serialize(item))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const before = await db.inventoryItem.findUnique({ where: { id } })
  if (!before) return err("Bien introuvable", 404)

  const allowed = ["name", "category", "purchasePrice", "currentValue", "condition", "location", "maintenanceNote", "responsibleId"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) {
      if (k === "purchasePrice" || k === "currentValue") {
        const n = body[k] === "" || body[k] === null ? null : Number(body[k])
        data[k] = isNaN(n as number) ? 0 : n
      } else {
        data[k] = body[k]
      }
    }
  }
  if ("purchaseDate" in body) {
    data.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null
  }

  const after = await db.inventoryItem.update({ where: { id }, data })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "UPDATE", entity: "InventoryItem", entityId: id, before, after, description: `Mise à jour bien ${before.inventoryNo}` })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.inventoryItem.findUnique({ where: { id } })
  if (!before) return err("Bien introuvable", 404)
  await db.inventoryItem.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "DELETE", entity: "InventoryItem", entityId: id, before, description: `Suppression bien ${before.inventoryNo}` })
  return ok({ ok: true })
}
