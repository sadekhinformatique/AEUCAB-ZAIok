/**
 * SGIAU — Migration du module Sport vers le modèle « compétitions » (production).
 *
 * Aligne la base existante sur le nouveau fonctionnement :
 *   - crée la compétition inter-classes par défaut (idempotent) ;
 *   - rattache toutes les équipes existantes à cette compétition ;
 *   - convertit les anciens statuts (INSCRIPTION → SUBMITTED, CONFIRMED →
 *     VALIDATED, REJECTED conservé) vers le workflow BROUILLON → SOUMISE →
 *     EN VÉRIFICATION → VALIDÉE / REFUSÉE ;
 *   - lie les disciplines actives à la compétition.
 *
 * À exécuter APRÈS `npx prisma db push` :
 *   bun run db:migrate-sport
 */
import { db } from "@/lib/db"

const DEFAULT_COMPETITION_NAME = "Compétition Sportive Inter-Classes"

async function main() {
  console.log("\n── Migration Sport → Compétitions ─────────────────────────")

  // 1) Compétition par défaut (idempotent)
  let competition = await db.sportCompetition.findFirst({
    where: { name: DEFAULT_COMPETITION_NAME },
  })
  if (!competition) {
    const year = new Date().getFullYear()
    competition = await db.sportCompetition.create({
      data: {
        name: DEFAULT_COMPETITION_NAME,
        description:
          "Compétition inter-classes créée automatiquement lors de la migration — les équipes historiques y ont été rattachées.",
        academicYear: `${year}-${year + 1}`,
        status: "OPEN",
        fee: 0,
      },
    })
    console.log(`✔ Compétition créée : ${competition.name} (${competition.id})`)
  } else {
    console.log(`↪ Compétition existante réutilisée : ${competition.name}`)
  }

  // 2) Rattachement des équipes existantes
  const legacyTeams = await db.sportTeam.findMany({
    where: { competitionId: null },
    select: { id: true },
  })
  for (const t of legacyTeams) {
    await db.sportTeam.update({ where: { id: t.id }, data: { competitionId: competition.id } })
  }
  console.log(`✔ ${legacyTeams.length} équipe(s) rattachée(s) à la compétition`)

  // 3) Conversion des statuts
  const statusMap: Record<string, string> = {
    INSCRIPTION: "SUBMITTED",
    CONFIRMED: "VALIDATED",
    REJECTED: "REJECTED",
  }
  let converted = 0
  for (const [from, to] of Object.entries(statusMap)) {
    const res = await db.sportTeam.updateMany({ where: { status: from }, data: { status: to } })
    converted += res.count
  }
  console.log(`✔ ${converted} équipe(s) : statuts convertis vers le workflow de validation`)

  // 4) Disciplines actives liées à la compétition
  const activeDisciplines = await db.sportDiscipline.findMany({ where: { active: true } })
  let linked = 0
  for (const d of activeDisciplines) {
    const exists = await db.sportCompetitionDiscipline.findUnique({
      where: { competitionId_disciplineId: { competitionId: competition.id, disciplineId: d.id } },
    })
    if (!exists) {
      await db.sportCompetitionDiscipline.create({
        data: { competitionId: competition.id, disciplineId: d.id },
      })
      linked++
    }
  }
  console.log(`✔ ${linked} discipline(s) active(s) ajoutée(s) à la compétition`)

  // 5) Postes par défaut pour le Football (si aucune discipline n'en a)
  const football = await db.sportDiscipline.findFirst({ where: { name: { contains: "foot", mode: "insensitive" } } })
  if (football) {
    const existing = await db.sportPosition.count({ where: { disciplineId: football.id } })
    if (existing === 0) {
      const defaultPositions = ["Gardien", "Défenseur", "Milieu", "Attaquant"]
      await db.sportPosition.createMany({
        data: defaultPositions.map((name) => ({ disciplineId: football.id, name })),
      })
      console.log(`✔ Postes par défaut créés pour ${football.name} : ${defaultPositions.join(", ")}`)
    } else {
      console.log(`↪ ${football.name} possède déjà ${existing} poste(s) configuré(s)`)
    }
  }

  // 6) Journal d'audit
  const admin = await db.user.findFirst({ where: { role: "ADMIN_IT" } })
  if (admin) {
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "MIGRATE",
        entity: "SportCompetition",
        entityId: competition.id,
        description: `Migration Sport : ${legacyTeams.length} équipe(s) rattachée(s), ${converted} statut(s) converti(s), ${linked} discipline(s) liée(s) — ${competition.name}`,
      },
    })
  }

  console.log("──────────────────────────────────────────────────────────")
  console.log("✔ Postes configurables, demandes de participation, notifications et")
  console.log("  actualités (annonces enrichies) disponibles.")
  console.log("Migration terminée. N'oubliez pas de créer le compte du responsable")
  console.log("des sports (rôle RESPONSABLE_SPORT) via le module Utilisateurs.\n")
}

main()
  .catch((e) => {
    console.error("migrate-sport-competitions failed:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
