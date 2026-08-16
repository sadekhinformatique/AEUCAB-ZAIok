import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

interface SheetPlayer {
  name: string
  number?: number | null
  goals?: number
  cards?: string
}

/** Valide le contenu de la feuille avant confirmation officielle. */
function validateSheet(sheet: unknown): { error: string | null; scoreA: number; scoreB: number; playersA: SheetPlayer[]; playersB: SheetPlayer[] } {
  const s = (sheet ?? {}) as Record<string, unknown>
  const scoreA = Number(s.scoreA)
  const scoreB = Number(s.scoreB)
  if (!Number.isInteger(scoreA) || scoreA < 0) return { error: "Le score de l'équipe A est requis (entier positif)", scoreA: 0, scoreB: 0, playersA: [], playersB: [] }
  if (!Number.isInteger(scoreB) || scoreB < 0) return { error: "Le score de l'équipe B est requis (entier positif)", scoreA, scoreB: 0, playersA: [], playersB: [] }

  const cleanPlayers = (raw: unknown): SheetPlayer[] =>
    (Array.isArray(raw) ? raw : []).map((p) => {
      const pp = (p ?? {}) as Record<string, unknown>
      return {
        name: typeof pp.name === "string" ? pp.name.trim() : "",
        number: pp.number === null || pp.number === undefined || pp.number === "" ? null : Number(pp.number),
        goals: pp.goals === null || pp.goals === undefined || pp.goals === "" ? 0 : Number(pp.goals),
        cards: typeof pp.cards === "string" ? pp.cards : "NONE",
      }
    })

  const playersA = cleanPlayers(s.playersA)
  const playersB = cleanPlayers(s.playersB)
  if (!playersA.length) return { error: "La feuille doit contenir les joueurs de l'équipe A", scoreA, scoreB, playersA, playersB }
  if (!playersB.length) return { error: "La feuille doit contenir les joueurs de l'équipe B", scoreA, scoreB, playersA, playersB }

  const sumGoals = (list: SheetPlayer[]) => list.reduce((acc, p) => acc + (Number.isFinite(p.goals) ? (p.goals ?? 0) : 0), 0)
  if (sumGoals(playersA) !== scoreA) return { error: `Le total des buts de l'équipe A (${sumGoals(playersA)}) ne correspond pas au score (${scoreA})`, scoreA, scoreB, playersA, playersB }
  if (sumGoals(playersB) !== scoreB) return { error: `Le total des buts de l'équipe B (${sumGoals(playersB)}) ne correspond pas au score (${scoreB})`, scoreA, scoreB, playersA, playersB }

  return { error: null, scoreA, scoreB, playersA, playersB }
}

/**
 * Confirmation officielle de la feuille de match.
 * POST /api/sport/matches/:id/sheet/confirm — réservée au responsable des sports.
 * Marque le match PLAYED, fige le score et attribue un numéro de feuille.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportMatch.findUnique({ where: { id } })
  if (!before) return err("Match introuvable", 404)
  if (before.sheetStatus === "CONFIRMED") return err("La feuille de match est déjà confirmée", 422)

  const body = await req.json()
  const sheet: Record<string, unknown> = {
    ...(before.sheet as Record<string, unknown> ?? {}),
    ...(typeof body.sheet === "object" && body.sheet ? body.sheet : body),
  }
  const check = validateSheet(sheet)
  if (check.error) return err(check.error, 422)

  // Numéro officiel de la feuille (séquentiel par année)
  const year = new Date().getFullYear()
  const count = await db.sportMatch.count({
    where: { sheetStatus: "CONFIRMED", sheetNumber: { startsWith: `FM-${year}-` } },
  })
  const sheetNumber = `FM-${year}-${String(count + 1).padStart(4, "0")}`

  const after = await db.sportMatch.update({
    where: { id },
    data: {
      sheet: {
        ...sheet,
        scoreA: check.scoreA,
        scoreB: check.scoreB,
        playersA: check.playersA,
        playersB: check.playersB,
      } as object,
      sheetStatus: "CONFIRMED",
      sheetNumber,
      sheetConfirmedAt: new Date(),
      sheetConfirmedBy: gate.user.id,
      status: "PLAYED",
      scoreA: check.scoreA,
      scoreB: check.scoreB,
    },
  })
  await audit({
    userId: gate.user.id,
    action: "UPDATE",
    entity: "SportMatch",
    entityId: id,
    before,
    after,
    description: `Confirmation officielle de la feuille de match ${sheetNumber} (${check.scoreA}-${check.scoreB})`,
  })
  return ok(serialize(after))
}
