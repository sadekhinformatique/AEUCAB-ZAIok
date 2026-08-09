import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

const ALL_ENTITIES = ["members", "payments", "expenses", "documents", "activities", "meetings"] as const
type Entity = typeof ALL_ENTITIES[number]

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const entitiesParam = url.searchParams.get("entities")
  const entities: Entity[] = entitiesParam
    ? (entitiesParam.split(",").filter((e) => ALL_ENTITIES.includes(e as Entity)) as Entity[])
    : [...ALL_ENTITIES]

  if (!q || q.length < 2) return ok({ members: [], payments: [], expenses: [], documents: [], activities: [], meetings: [] })

  const results: Record<string, unknown[]> = {
    members: [], payments: [], expenses: [], documents: [], activities: [], meetings: [],
  }

  if (entities.includes("members")) {
    const items = await db.member.findMany({
      where: {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { matricule: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    })
    results.members = items.map((m) => ({
      id: m.id, matricule: m.matricule, name: `${m.firstName} ${m.lastName}`,
      faculty: m.faculty, level: m.level, status: m.status, email: m.email,
    }))
  }

  if (entities.includes("payments")) {
    const items = await db.payment.findMany({
      where: {
        OR: [
          { reference: { contains: q } },
          { note: { contains: q } },
          { member: { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { matricule: { contains: q } }] } },
        ],
      },
      include: { member: true, cotisationType: true },
      take: 5,
      orderBy: { paymentDate: "desc" },
    })
    results.payments = items.map((p) => ({
      id: p.id, reference: p.reference, amount: p.amountPaid, mode: p.paymentMode,
      status: p.status, date: p.paymentDate,
      member: `${p.member.firstName} ${p.member.lastName}`, matricule: p.member.matricule,
      cotisation: p.cotisationType?.name ?? null,
    }))
  }

  if (entities.includes("expenses")) {
    const items = await db.expense.findMany({
      where: {
        OR: [
          { reference: { contains: q } },
          { label: { contains: q } },
          { note: { contains: q } },
        ],
      },
      include: { category: true },
      take: 5,
      orderBy: { date: "desc" },
    })
    results.expenses = items.map((e) => ({
      id: e.id, reference: e.reference, label: e.label, amount: e.amount,
      status: e.status, date: e.date, category: e.category?.name ?? null,
    }))
  }

  if (entities.includes("documents")) {
    const items = await db.document.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { tags: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    })
    results.documents = items.map((d) => ({
      id: d.id, title: d.title, category: d.category, visibility: d.visibility,
      createdAt: d.createdAt, signedBy: d.signedBy,
    }))
  }

  if (entities.includes("activities")) {
    const items = await db.activity.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { location: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { startDate: "desc" },
    })
    results.activities = items.map((a) => ({
      id: a.id, name: a.name, type: a.type, status: a.status,
      startDate: a.startDate, location: a.location,
    }))
  }

  if (entities.includes("meetings")) {
    const items = await db.meeting.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { agenda: { contains: q } },
          { decisions: { contains: q } },
          { location: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { startDate: "desc" },
    })
    results.meetings = items.map((m) => ({
      id: m.id, title: m.title, status: m.status,
      startDate: m.startDate, location: m.location,
    }))
  }

  return ok(results)
}
