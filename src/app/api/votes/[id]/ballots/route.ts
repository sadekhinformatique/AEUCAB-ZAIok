import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { optionId, candidateId, memberId } = body

  if (!memberId) return err("Le membre est requis", 422)
  if (!optionId && !candidateId) return err("optionId ou candidateId est requis", 422)

  const vote = await db.vote.findUnique({ where: { id } })
  if (!vote) return err("Vote introuvable", 404)
  if (vote.status === "CLOSED") return err("Vote clôturé", 422)

  // Enforce one ballot per member per vote
  const already = await db.voteBallot.findFirst({
    where: { voteId: id, memberId },
  })
  if (already) return err("Vous avez déjà voté", 409)

  // Validate option
  if (optionId) {
    const opt = await db.voteOption.findUnique({ where: { id: optionId } })
    if (!opt || opt.voteId !== id) return err("Option invalide", 422)
  }

  const ballot = await db.voteBallot.create({
    data: {
      voteId: id,
      optionId: optionId || null,
      candidateId: candidateId || null,
      memberId: vote.anonymous ? null : memberId,
    },
    include: { option: { select: { id: true, label: true } } },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "VoteBallot",
    entityId: ballot.id,
    after: vote.anonymous ? { ...ballot, memberId: null } : ballot,
    description: `Bulletins déposés pour le vote "${vote.title}"`,
  })
  return ok(serialize(ballot), 201)
}
