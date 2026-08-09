import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, serialize } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

// GET all borrows (include member + resource), with optional status filter
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const status = url.searchParams.get("status")

  const now = new Date()

  // If no explicit status filter, compute dynamic OVERDUE for BORROWED items past dueDate
  if (status && status !== "ALL") {
    let where: Record<string, unknown>
    if (status === "OVERDUE") {
      where = { status: "BORROWED", dueDate: { lt: now } }
    } else if (status === "BORROWED") {
      where = { status: "BORROWED", OR: [{ dueDate: null }, { dueDate: { gte: now } }] }
    } else {
      where = { status }
    }
    const items = await db.libraryBorrow.findMany({
      where,
      include: {
        member: { select: { id: true, matricule: true, firstName: true, lastName: true, phone: true, email: true } },
        resource: { select: { id: true, title: true, author: true, category: true } },
      },
      orderBy: { borrowedAt: "desc" },
    })
    const decorated = items.map((b) => ({
      ...b,
      status: b.status === "BORROWED" && b.dueDate && new Date(b.dueDate) < now ? "OVERDUE" : b.status,
    }))
    return ok(serialize(decorated))
  }

  const items = await db.libraryBorrow.findMany({
    include: {
      member: { select: { id: true, matricule: true, firstName: true, lastName: true, phone: true, email: true } },
      resource: { select: { id: true, title: true, author: true, category: true } },
    },
    orderBy: { borrowedAt: "desc" },
    take: 500,
  })
  const decorated = items.map((b) => ({
    ...b,
    status: b.status === "BORROWED" && b.dueDate && new Date(b.dueDate) < now ? "OVERDUE" : b.status,
  }))
  return ok(serialize(decorated))
}
