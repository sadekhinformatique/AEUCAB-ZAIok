import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, serialize, requireAdmin } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const gate = await requireAdmin()
  if (gate.error) return err(gate.error === 401 ? "Non authentifié" : "Accès réservé aux administrateurs", gate.error)
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const action = url.searchParams.get("action")
  const entity = url.searchParams.get("entity")
  const startDate = url.searchParams.get("start")
  const endDate = url.searchParams.get("end")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500)
  const offset = parseInt(url.searchParams.get("offset") || "0")

  const where: Record<string, unknown> = {}
  if (action && action !== "ALL") where.action = action
  if (entity && entity !== "ALL") where.entity = entity
  if (q) where.description = { contains: q }
  if (startDate || endDate) {
    const range: Record<string, Date> = {}
    if (startDate) range.gte = new Date(startDate)
    if (endDate) range.lte = new Date(endDate)
    where.createdAt = range
  }

  const [items, total, todayCount, byActionRaw] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { user: { select: { id: true, fullName: true, username: true } } },
    }),
    db.auditLog.count({ where }),
    db.auditLog.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    db.auditLog.groupBy({ by: ["action"], _count: true }),
  ])

  const byAction: Record<string, number> = {}
  for (const a of byActionRaw) byAction[a.action] = a._count

  return ok({ items: serialize(items), total, todayCount, byAction, hasMore: offset + items.length < total })
}
