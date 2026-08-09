import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, getCurrentUserId } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { memberId, position, program } = body
  if (!memberId) return err("Le membre est requis", 422)
  if (!position?.trim()) return err("Le poste visé est requis", 422)

  const election = await db.election.findUnique({ where: { id } })
  if (!election) return err("Élection introuvable", 404)
  if (election.status === "CLOSED") return err("Élection clôturée", 422)

  const existing = await db.electionCandidate.findUnique({
    where: { electionId_memberId: { electionId: id, memberId } },
  })
  if (existing) return err("Ce membre est déjà candidat", 409)

  const candidate = await db.electionCandidate.create({
    data: {
      electionId: id,
      memberId,
      position: position.trim(),
      program: program || null,
    },
    include: { member: { select: { id: true, matricule: true, firstName: true, lastName: true, faculty: true } } },
  })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "CREATE",
    entity: "ElectionCandidate",
    entityId: candidate.id,
    after: candidate,
    description: `Candidature de ${candidate.member.firstName} ${candidate.member.lastName} au poste de ${position}`,
  })
  return ok(serialize(candidate), 201)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(req.url)
  const candidateId = url.searchParams.get("candidateId")
  if (!candidateId) return err("candidateId est requis", 422)

  const before = await db.electionCandidate.findUnique({ where: { id: candidateId } })
  if (!before || before.electionId !== id) return err("Candidat introuvable", 404)

  await db.electionCandidate.delete({ where: { id: candidateId } })
  const userId = await getCurrentUserId()
  await audit({
    userId,
    action: "DELETE",
    entity: "ElectionCandidate",
    entityId: candidateId,
    before,
    description: `Retrait d'une candidature`,
  })
  return ok({ ok: true })
}
