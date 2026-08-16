import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, err, audit, serialize, requireSportResponsable } from "@/lib/sgiau/api"

export const dynamic = "force-dynamic"

const STATUSES = ["DRAFT", "OPEN", "LAUNCHED", "CLOSED"]

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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const competition = await db.sportCompetition.findUnique({
    where: { id },
    include: {
      disciplines: { include: { discipline: true } },
      delegates: { include: { member: true } },
      referees: { include: { member: true } },
      participants: true,
    },
  })
  if (!competition) return err("Compétition introuvable", 404)
  return ok(serialize(competition))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportCompetition.findUnique({ where: { id } })
  if (!before) return err("Compétition introuvable", 404)

  const body = await req.json()
  const data: Record<string, unknown> = {}

  // ——— Changement de statut ———
  if (typeof body.status === "string" && STATUSES.includes(body.status) && body.status !== before.status) {
    if (body.status === "LAUNCHED") {
      return err("Le lancement officiel passe par l'action dédiée « Lancer la compétition »", 422)
    }
    const allowed: Record<string, string[]> = {
      OPEN: ["DRAFT"],
      DRAFT: ["OPEN"],
      CLOSED: ["OPEN", "LAUNCHED"],
    }
    if (!(allowed[body.status] ?? []).includes(before.status)) {
      return err(`Transition de statut invalide : ${before.status} → ${body.status}`, 422)
    }
    data.status = body.status
  }

  // ——— Configuration ———
  if (before.status === "LAUNCHED" || before.status === "CLOSED") {
    if (body.name !== undefined || body.classes !== undefined || body.disciplineIds !== undefined) {
      return err("Une compétition lancée ou close ne peut plus être reconfigurée", 422)
    }
  }
  if (typeof body.name === "string") data.name = body.name.trim()
  if (typeof body.description === "string") data.description = body.description.trim() || null
  if (typeof body.academicYear === "string") data.academicYear = body.academicYear.trim() || null
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null
  if (body.fee !== undefined) data.fee = Math.max(0, Number(body.fee) || 0)
  if (body.classes !== undefined) data.classes = classesToJson(body.classes)

  const after = await db.sportCompetition.update({ where: { id }, data })

  // ——— Disciplines de la compétition ———
  if (Array.isArray(body.disciplineIds) && before.status !== "LAUNCHED" && before.status !== "CLOSED") {
    const discs = await db.sportDiscipline.findMany({ where: { id: { in: body.disciplineIds } } })
    if (discs.length !== body.disciplineIds.length) {
      return err("Une discipline sélectionnée n'existe pas", 422)
    }
    await db.sportCompetitionDiscipline.deleteMany({ where: { competitionId: id } })
    if (body.disciplineIds.length) {
      await db.sportCompetitionDiscipline.createMany({
        data: body.disciplineIds.map((d: string) => ({ competitionId: id, disciplineId: d })),
      })
    }
  }

  await audit({
    userId: gate.user.id,
    action: "UPDATE",
    entity: "SportCompetition",
    entityId: id,
    before,
    after,
    description: `Mise à jour de la compétition ${after.name}`,
  })
  return ok(serialize(after))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSportResponsable()
  if (gate.error !== null) {
    return err(gate.error === 401 ? "Non authentifié" : "Réservé au responsable des sports de l'Amicale", gate.error)
  }

  const { id } = await params
  const before = await db.sportCompetition.findUnique({ where: { id } })
  if (!before) return err("Compétition introuvable", 404)
  if (before.status !== "DRAFT") {
    return err("Seule une compétition en préparation (DRAFT) peut être supprimée", 409)
  }
  const teams = await db.sportTeam.count({ where: { competitionId: id } })
  if (teams > 0) {
    return err("Impossible de supprimer : des équipes sont déjà inscrites à cette compétition", 409)
  }

  await db.sportCompetition.delete({ where: { id } })
  await audit({
    userId: gate.user.id,
    action: "DELETE",
    entity: "SportCompetition",
    entityId: id,
    before,
    description: `Suppression de la compétition ${before.name}`,
  })
  return ok({ ok: true })
}
