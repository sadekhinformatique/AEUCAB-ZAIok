import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

/**
 * Réouverture d'une feuille confirmée pour correction (retour en brouillon).
 * POST /api/sport/matches/:id/sheet/reopen — réservée au responsable des sports.
 * Le match repasse SCHEDULED et les scores sont dégelés jusqu'à re-confirmation.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportMatch.findUnique({ where: { id } })
  if (!before) return err("Match introuvable", 404)
  if (before.sheetStatus !== "CONFIRMED") return err("Seule une feuille confirmée peut être rouverte", 422)

  const after = await db.sportMatch.update({
    where: { id },
    data: {
      sheetStatus: "DRAFT",
      sheetNumber: null,
      sheetConfirmedAt: null,
      sheetConfirmedBy: null,
      status: "SCHEDULED",
      scoreA: null,
      scoreB: null,
    },
  })

  // Les sanctions issues de la feuille rouverte sont annulées (le match est rejoué)
  const canceled = await db.sportSanction.updateMany({
    where: { matchId: id, status: "ACTIVE" },
    data: { status: "CANCELED" },
  })
  await audit({
    userId: gate.user.id,
    action: "UPDATE",
    entity: "SportMatch",
    entityId: id,
    before,
    after,
    description: `Réouverture de la feuille de match ${before.sheetNumber ?? ""} pour correction${canceled.count ? ` (${canceled.count} sanction(s) annulée(s))` : ""}`,
  })
  return ok(serialize(after))
}
