import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

/**
 * Sauvegarde la feuille de match en brouillon (DRAFT).
 * PUT /api/sport/matches/:id/sheet — réservée au responsable des sports.
 * Corps : { scoreA, scoreB, playersA, playersB, refereeName, observations }
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportMatch.findUnique({ where: { id } })
  if (!before) return err("Match introuvable", 404)

  const body = await req.json()
  const parseScore = (v: unknown): number | null =>
    v === null || v === undefined || v === "" ? null : Number(v)

  const scoreA = parseScore(body.scoreA)
  const scoreB = parseScore(body.scoreB)
  if (scoreA !== null && (!Number.isInteger(scoreA) || scoreA < 0)) return err("Le score A doit être un entier positif", 422)
  if (scoreB !== null && (!Number.isInteger(scoreB) || scoreB < 0)) return err("Le score B doit être un entier positif", 422)

  const sheet: Record<string, unknown> = {
    scoreA,
    scoreB,
    playersA: Array.isArray(body.playersA) ? body.playersA : [],
    playersB: Array.isArray(body.playersB) ? body.playersB : [],
    refereeName: typeof body.refereeName === "string" ? body.refereeName.trim() : "",
    observations: typeof body.observations === "string" ? body.observations.trim() : "",
  }

  const after = await db.sportMatch.update({
    where: { id },
    data: {
      sheet: sheet as object,
      sheetStatus: "DRAFT",
      scoreA,
      scoreB,
      status: before.status === "PLAYED" ? before.status : "SCHEDULED",
    },
  })
  await audit({
    userId: gate.user.id,
    action: "UPDATE",
    entity: "SportMatch",
    entityId: id,
    before,
    after,
    description: "Sauvegarde du brouillon de la feuille de match",
  })
  return ok(serialize(after))
}
