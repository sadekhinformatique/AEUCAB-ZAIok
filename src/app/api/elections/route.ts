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
      { name: { contains: q } },
      { description: { contains: q } },
    ]
  }

  const elections = await db.election.findMany({
    where,
    orderBy: { startDate: "desc" },
    take: limit,
    include: {
      _count: { select: { candidates: true, ballots: true } },
    },
  })
  return ok(serialize(elections))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, startDate, endDate, status } = body
  if (!name?.trim()) return err("Le nom de l'élection est requis", 422)
  if (!startDate || !endDate) return err("Les dates de début et de fin sont requises", 422)

  const election = await db.election.create({
    data: {
      name: name.trim(),
      description: description || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || "OPEN",
    },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "Election",
    entityId: election.id,
    after: election,
    description: `Création élection ${election.name}`,
  })
  return ok(serialize(election), 201)
}
