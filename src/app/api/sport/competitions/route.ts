import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

function classesToJson(classes: unknown): string | null {
  if (!Array.isArray(classes)) return null
  const clean = classes
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .filter((c) => typeof c.className === "string" && c.className.trim())
    .map((c) => ({
      className: (c.className as string).trim(),
      level: ((c.level as string) ?? "").toString().trim(),
    }))
  return clean.length ? JSON.stringify(clean) : null
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const status = url.searchParams.get("status")
  const where: Record<string, unknown> = {}
  if (status && status !== "ALL") where.status = status

  const competitions = await db.sportCompetition.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { teams: true, delegates: true, referees: true, participants: true } },
      disciplines: { include: { discipline: { include: { positions: { orderBy: { createdAt: "asc" } } } } } },
    },
  })
  return ok(serialize(competitions))
}

export async function POST(req: NextRequest) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const body = await req.json()
  const { name, description, academicYear, startDate, endDate, fee, classes, disciplineIds } = body
  if (!name?.trim()) return err("Le nom de la compétition est requis", 422)

  const competition = await db.sportCompetition.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      academicYear: academicYear?.trim() || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      fee: Math.max(0, Number(fee) || 0),
      classes: classesToJson(classes),
      status: "DRAFT",
    },
  })

  if (Array.isArray(disciplineIds) && disciplineIds.length) {
    const discs = await db.sportDiscipline.findMany({ where: { id: { in: disciplineIds } } })
    if (discs.length !== disciplineIds.length) {
      return err("Une discipline sélectionnée n'existe pas", 422)
    }
    await db.sportCompetitionDiscipline.createMany({
      data: disciplineIds.map((d: string) => ({ competitionId: competition.id, disciplineId: d })),
    })
  }

  await audit({
    userId: gate.user.id,
    action: "CREATE",
    entity: "SportCompetition",
    entityId: competition.id,
    after: competition,
    description: `Création de la compétition ${competition.name}`,
  })
  return ok(serialize(competition), 201)
}
