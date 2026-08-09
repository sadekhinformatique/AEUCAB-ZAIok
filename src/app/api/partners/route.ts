import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const type = url.searchParams.get("type")

  const where: Record<string, unknown> = {}
  if (type && type !== "ALL") where.type = type
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { contactName: { contains: q } },
      { contactEmail: { contains: q } },
      { contactPhone: { contains: q } },
    ]
  }

  const items = await db.partner.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  })
  return ok(serialize(items))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, type, contactName, contactPhone, contactEmail, address, contribution, startDate, endDate, note } = body
  if (!name || !name.trim()) return err("Le nom du partenaire est requis", 422)

  const partner = await db.partner.create({
    data: {
      name: name.trim(),
      type: type || "PARTNER",
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      address: address || null,
      contribution: Number(contribution) || 0,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      note: note || null,
    },
  })
  const userId = await getCurrentUserId()
  await audit({ userId, action: "CREATE", entity: "Partner", entityId: partner.id, after: partner, description: `Nouveau partenaire ${partner.name}` })
  return ok(serialize(partner), 201)
}
