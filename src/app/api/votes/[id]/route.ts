import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const vote = await db.vote.findUnique({
    where: { id },
    include: {
      options: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { ballots: true } } },
      },
      ballots: {
        include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true } } },
        orderBy: { votedAt: "desc" },
      },
      _count: { select: { ballots: true } },
    },
  })
  if (!vote) return err("Vote introuvable", 404)

  const options = vote.options.map((o) => ({
    id: o.id,
    label: o.label,
    voteCount: o._count.ballots,
    createdAt: o.createdAt,
  }))
  const total = options.reduce((sum, o) => sum + o.voteCount, 0)
  return ok(serialize({ ...vote, options, totalBallots: total }))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const before = await db.vote.findUnique({ where: { id } })
  if (!before) return err("Vote introuvable", 404)

  const allowed = ["title", "question", "anonymous", "startDate", "endDate", "status", "qrCode"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) {
      if (k === "startDate" || k === "endDate") data[k] = body[k] ? new Date(body[k]) : null
      else data[k] = body[k]
    }
  }
  const after = await db.vote.update({ where: { id }, data })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "UPDATE",
    entity: "Vote",
    entityId: id,
    before,
    after,
    description: `Modification vote ${before.title}`,
  })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const before = await db.vote.findUnique({ where: { id } })
  if (!before) return err("Vote introuvable", 404)
  await db.vote.delete({ where: { id } })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "DELETE",
    entity: "Vote",
    entityId: id,
    before,
    description: `Suppression vote ${before.title}`,
  })
  return ok({ ok: true })
}
