import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const category = url.searchParams.get("category")
  const condition = url.searchParams.get("condition")

  const where: Record<string, unknown> = {}
  if (category && category !== "ALL") where.category = category
  if (condition && condition !== "ALL") where.condition = condition
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { inventoryNo: { contains: q } },
      { location: { contains: q } },
    ]
  }

  const items = await db.inventoryItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  })
  return ok(serialize(items))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, category, purchasePrice, currentValue, condition, location, purchaseDate, maintenanceNote } = body
  if (!name || !name.trim()) return err("Le nom du bien est requis", 422)

  const year = new Date().getFullYear()
  const seq = (await db.inventoryItem.count()) + 1
  const inventoryNo = `INV-${year}-${String(seq).padStart(4, "0")}`

  const item = await db.inventoryItem.create({
    data: {
      inventoryNo,
      name: name.trim(),
      category: category || null,
      purchasePrice: num(purchasePrice) ?? 0,
      currentValue: num(currentValue) ?? num(purchasePrice) ?? 0,
      condition: condition || "GOOD",
      location: location || null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      maintenanceNote: maintenanceNote || null,
    },
  })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "CREATE", entity: "InventoryItem", entityId: item.id, after: item, description: `Création bien ${item.inventoryNo} — ${item.name}` })
  return ok(serialize(item), 201)
}

function num(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}
