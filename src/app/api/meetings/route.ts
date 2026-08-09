import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  const status = url.searchParams.get("status")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500)

  const where: Record<string, unknown> = {}
  if (status && status !== "ALL") where.status = status
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { location: { contains: q } },
      { agenda: { contains: q } },
      { decisions: { contains: q } },
    ]
  }

  const meetings = await db.meeting.findMany({
    where,
    orderBy: { startDate: "desc" },
    take: limit,
    include: {
      _count: { select: { participants: true } },
      participants: { where: { attended: true }, select: { id: true } },
    },
  })
  const result = meetings.map((m) => serialize({
    ...m,
    _count: { ...m._count, attended: m.participants.length },
    participants: undefined,
  }))
  return ok(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, agenda, startDate, endDate, location, status } = body
  if (!title?.trim()) return err("Le titre est requis", 422)
  if (!startDate) return err("La date de début est requise", 422)

  const meeting = await db.meeting.create({
    data: {
      title: title.trim(),
      agenda: agenda || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      location: location || null,
      status: status || "SCHEDULED",
    },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "Meeting",
    entityId: meeting.id,
    after: meeting,
    description: `Création réunion ${meeting.title}`,
  })
  return ok(serialize(meeting), 201)
}
