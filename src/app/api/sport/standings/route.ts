import { NextRequest } from "next/server"
import { ok, err, serialize } from "@/lib/sgiau/api"
import { computeStandings } from "@/lib/sgiau/sport"

export const dynamic = "force-dynamic"

/**
 * Classements & résultats publiés dans l'application étudiante.
 * GET ?competitionId=&disciplineId= — accessible à tout utilisateur authentifié.
 */
export async function GET(req: NextRequest) {
  const competitionId = new URL(req.url).searchParams.get("competitionId")
  const disciplineId = new URL(req.url).searchParams.get("disciplineId")
  if (!competitionId || !disciplineId) return err("competitionId et disciplineId requis", 422)

  const standings = await computeStandings({ competitionId, disciplineId })
  return ok(serialize(standings))
}
