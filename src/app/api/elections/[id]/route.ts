import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const election = await db.election.findUnique({
    where: { id },
    include: {
      candidates: {
        include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true } } },
        orderBy: { createdAt: "asc" },
      },
      ballots: {
        include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true } } },
        orderBy: { votedAt: "desc" },
      },
      _count: { select: { candidates: true, ballots: true } },
    },
  })
  if (!election) return err("Élection introuvable", 404)

  // Compute vote counts per candidate
  const counts: Record<string, number> = {}
  for (const b of election.ballots) {
    if (b.candidateId) counts[b.candidateId] = (counts[b.candidateId] ?? 0) + 1
  }
  const candidates = election.candidates.map((c) => ({
    ...c,
    voteCount: counts[c.id] ?? 0,
  }))
  const ballots = election.ballots.map(({ voterId: _voterId, ...b }) => b)
  return ok(serialize({ ...election, ballots, candidates }))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const before = await db.election.findUnique({ where: { id } })
  if (!before) return err("Élection introuvable", 404)

  const allowed = ["name", "description", "startDate", "endDate", "status"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) {
      if (k === "startDate" || k === "endDate") data[k] = body[k] ? new Date(body[k]) : null
      else data[k] = body[k]
    }
  }
  if (data.status === "CLOSED") data.archivedAt = new Date()

  const after = await db.election.update({ where: { id }, data })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "UPDATE",
    entity: "Election",
    entityId: id,
    before,
    after,
    description: `Modification élection ${before.name}`,
  })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.election.findUnique({ where: { id } })
  if (!before) return err("Élection introuvable", 404)
  await db.election.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "DELETE",
    entity: "Election",
    entityId: id,
    before,
    description: `Suppression élection ${before.name}`,
  })
  return ok({ ok: true })
}
