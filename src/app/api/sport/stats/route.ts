import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, serialize } from "@/lib/sgiau/api"
import { normalizeCard } from "@/lib/sgiau/sport"

export const dynamic = "force-dynamic"

interface SheetRow {
  name?: unknown
  goals?: unknown
  cards?: unknown
}

interface Scorer {
  playerName: string
  teamId: string
  teamName: string
  disciplineId: string
  disciplineName: string
  goals: number
  matches: number
}

interface CardRow {
  playerName: string
  teamId: string
  teamName: string
  disciplineId: string
  disciplineName: string
  yellows: number
  doubleYellows: number
  reds: number
}

/**
 * Statistiques sportives publiées dans l'application étudiante :
 * meilleurs buteurs et cartons, issus des feuilles de match officielles.
 * GET /api/sport/stats?competitionId=&disciplineId=
 * Lecture publique authentifiée (espace membre + SAS).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const competitionId = url.searchParams.get("competitionId")
  const disciplineId = url.searchParams.get("disciplineId")

  const where: Record<string, unknown> = {
    sheetStatus: { in: ["CONFIRMED", "NONE"] },
    sheet: { not: null },
    status: "PLAYED",
  }
  if (disciplineId && disciplineId !== "ALL") where.disciplineId = disciplineId
  if (competitionId && competitionId !== "ALL") where.teamA = { competitionId }

  const matches = await db.sportMatch.findMany({
    where,
    select: {
      id: true,
      disciplineId: true,
      teamAId: true,
      teamBId: true,
      sheet: true,
      teamA: { select: { id: true, name: true, competitionId: true } },
      teamB: { select: { id: true, name: true, competitionId: true } },
      discipline: { select: { id: true, name: true } },
    },
  })

  const teamName = new Map<string, string>()
  for (const m of matches) {
    if (m.teamA) teamName.set(m.teamA.id, m.teamA.name)
    if (m.teamB) teamName.set(m.teamB.id, m.teamB.name)
  }

  const scorers = new Map<string, Scorer>()
  const cards = new Map<string, CardRow>()

  for (const m of matches) {
    const sheet = (m.sheet ?? {}) as Record<string, unknown>
    const lists: { key: "playersA" | "playersB"; teamId: string }[] = [
      { key: "playersA", teamId: m.teamAId },
      { key: "playersB", teamId: m.teamBId },
    ]
    for (const { key, teamId } of lists) {
      const rows = Array.isArray(sheet[key]) ? (sheet[key] as SheetRow[]) : []
      for (const row of rows) {
        const rawName = typeof row.name === "string" ? row.name.trim() : ""
        if (!rawName) continue
        const team = teamName.get(teamId) ?? "Équipe"
        const goals = Math.max(0, Number(row.goals) || 0)
        const card = normalizeCard(row.cards)
        const keyName = `${rawName.toLowerCase()}|${teamId}`

        if (goals > 0) {
          const cur = scorers.get(keyName) ?? {
            playerName: rawName, teamId, teamName: team,
            disciplineId: m.disciplineId, disciplineName: m.discipline?.name ?? "",
            goals: 0, matches: 0,
          }
          cur.playerName = rawName
          cur.goals += goals
          cur.matches += 1
          scorers.set(keyName, cur)
        }

        if (card !== "NONE") {
          const cur = cards.get(keyName) ?? {
            playerName: rawName, teamId, teamName: team,
            disciplineId: m.disciplineId, disciplineName: m.discipline?.name ?? "",
            yellows: 0, doubleYellows: 0, reds: 0,
          }
          cur.playerName = rawName
          if (card === "YELLOW") cur.yellows += 1
          else if (card === "DOUBLE_YELLOW") cur.doubleYellows += 1
          else if (card === "RED") cur.reds += 1
          cards.set(keyName, cur)
        }
      }
    }
  }

  const sortedScorers = [...scorers.values()].sort(
    (a, b) => b.goals - a.goals || a.matches - b.matches || a.playerName.localeCompare(b.playerName, "fr")
  )
  const sortedCards = [...cards.values()].sort(
    (a, b) =>
      (b.reds * 3 + b.doubleYellows * 2 + b.yellows) - (a.reds * 3 + a.doubleYellows * 2 + a.yellows) ||
      a.playerName.localeCompare(b.playerName, "fr")
  )

  return ok(serialize({ scorers: sortedScorers, cards: sortedCards }))
}
