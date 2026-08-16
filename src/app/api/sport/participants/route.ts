import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const competitionId = url.searchParams.get("competitionId")
  const where: Record<string, unknown> = {}
  if (competitionId) where.competitionId = competitionId

  const participants = await db.sportExceptionalParticipant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { competition: { select: { id: true, name: true } } },
  })
  return ok(serialize(participants))
}

/**
 * Participants exceptionnels — l'administration universitaire réelle
 * (directeurs des études, responsables pédagogiques…) autorisée à participer
 * sans être étudiante ni disposer d'un compte utilisateur. Enregistrés par le
 * responsable des sports de l'Amicale uniquement.
 */
export async function POST(req: NextRequest) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const body = await req.json()
  const { competitionId, firstName, lastName, function: role, phone, email } = body
  if (!competitionId) return err("La compétition est requise", 422)
  if (!firstName?.trim() || !lastName?.trim()) return err("Le nom et le prénom sont requis", 422)

  const competition = await db.sportCompetition.findUnique({ where: { id: competitionId } })
  if (!competition) return err("Compétition introuvable", 404)
  if (competition.status === "CLOSED") return err("Compétition close", 409)

  const participant = await db.sportExceptionalParticipant.create({
    data: {
      competitionId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      function: role?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      createdById: gate.user.id,
    },
  })
  await audit({
    userId: gate.user.id,
    action: "CREATE",
    entity: "SportExceptionalParticipant",
    entityId: participant.id,
    after: participant,
    description: `Inscription du participant exceptionnel ${participant.firstName} ${participant.lastName} (${competition.name})`,
  })
  return ok(serialize(participant), 201)
}
