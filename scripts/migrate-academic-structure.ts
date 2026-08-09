/**
 * SGIAU — Migration de la structure académique (production).
 *
 * Aligne la base de données existante sur la structure officielle :
 *   Niveaux  : AP → L1 → L2 → L3 (aucun L4, M1, M2, Master, Doctorat)
 *   Filières : Informatique et Gestion, Électromécanique, Administration
 *
 * Les anciens niveaux (M1, M2, L4, Master, Doctorat…) sont ramenés au
 * niveau terminal L3. Les anciennes facultés/intitulés sont convertis
 * vers l'une des 3 filières officielles. Rien n'est supprimé.
 *
 *   bun run db:migrate-academic
 */
import { db } from "@/lib/db"
import { LEVELS, FILIERES, normalizeLevel, normalizeFiliere } from "@/lib/sgiau/constants"

interface Row {
  level: string | null
  faculty: string | null
}

interface SimpleDelegate {
  findMany: (args: { select: { level: true; faculty: true } }) => Promise<Row[]>
  updateMany: (args: { where: Record<string, string>; data: Record<string, string> }) => Promise<{ count: number }>
}

function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort()
}

async function collect(delegate: SimpleDelegate): Promise<{ levels: string[]; faculties: string[] }> {
  const rows = await delegate.findMany({ select: { level: true, faculty: true } })
  return {
    levels: distinct(rows.map((r) => r.level)),
    faculties: distinct(rows.map((r) => r.faculty)),
  }
}

async function apply(
  delegate: SimpleDelegate,
  field: "level" | "faculty",
  value: string,
  normalized: string,
): Promise<number> {
  if (normalized === value) return 0
  const res = await delegate.updateMany({ where: { [field]: value }, data: { [field]: normalized } })
  return res.count
}

async function main() {
  const memberDelegate = db.member as unknown as SimpleDelegate
  const cotDelegate = db.cotisationType as unknown as SimpleDelegate

  const memberDistinct = await collect(memberDelegate)
  const cotDistinct = await collect(cotDelegate)
  const allLevels = distinct([...memberDistinct.levels, ...cotDistinct.levels])
  const allFaculties = distinct([...memberDistinct.faculties, ...cotDistinct.faculties])

  console.log("\n── Structure officielle ─────────────────────────────────────")
  console.log(`Niveaux  : ${LEVELS.join(" → ")}`)
  console.log(`Filières : ${FILIERES.join(", ")}`)
  console.log("──────────────────────────────────────────────────────────────")

  // ---- Niveaux ----
  console.log("\n── Niveaux rencontrés dans la base ──")
  let membersLevels = 0
  let cotLevels = 0
  for (const lv of allLevels) {
    const mapped = normalizeLevel(lv)
    if (mapped === null) {
      console.log(`  ${lv.padEnd(12)} ✖ à corriger manuellement`)
      continue
    }
    if (mapped === lv) {
      console.log(`  ${lv.padEnd(12)} ✔ valide`)
      continue
    }
    console.log(`  ${lv.padEnd(12)} → ${mapped} (ancien niveau)`)
    membersLevels += await apply(memberDelegate, "level", lv, mapped)
    cotLevels += await apply(cotDelegate, "level", lv, mapped)
  }
  console.log(`\nNiveaux corrigés : ${membersLevels} membre(s), ${cotLevels} type(s) de cotisation.`)

  // ---- Filières ----
  console.log("\n── Facultés / filières rencontrées dans la base ──")
  let membersFaculties = 0
  let cotFaculties = 0
  for (const fa of allFaculties) {
    const mapped = normalizeFiliere(fa)
    if (mapped === null) {
      console.log(`  ${fa.padEnd(24)} ✖ à corriger manuellement`)
      continue
    }
    if (mapped === fa) {
      console.log(`  ${fa.padEnd(24)} ✔ valide`)
      continue
    }
    console.log(`  ${fa.padEnd(24)} → ${mapped} (ancienne faculté)`)
    membersFaculties += await apply(memberDelegate, "faculty", fa, mapped)
    cotFaculties += await apply(cotDelegate, "faculty", fa, mapped)
  }
  console.log(`\nFilières corrigées : ${membersFaculties} membre(s), ${cotFaculties} type(s) de cotisation.`)

  // ---- Contrôle final ----
  const leftovers = await db.member.groupBy({ by: ["level", "faculty"], _count: true })
  const leftoverLevels = leftovers.filter((l) => l.level !== null && !(LEVELS as readonly string[]).includes(l.level as string))
  const leftoverFaculties = leftovers.filter((f) => f.faculty !== null && !(FILIERES as readonly string[]).includes(f.faculty as string))

  console.log("\n── Contrôle final ──")
  if (leftoverLevels.length === 0 && leftoverFaculties.length === 0) {
    console.log("✔ Aucun ancien niveau (M1, M2, L4, Master…) ni ancienne filière ne reste dans la base.")
  } else {
    if (leftoverLevels.length) console.log(`  Niveaux restants non conformes : ${[...new Set(leftoverLevels.map((l) => l.level))].join(", ")}`)
    if (leftoverFaculties.length) console.log(`  Filières restantes non conformes : ${[...new Set(leftoverFaculties.map((f) => f.faculty))].join(", ")}`)
  }

  // ---- Journal ----
  const admin = await db.user.findFirst({ where: { role: "ADMIN_IT" } })
  if (admin) {
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "STRUCTURE",
        entity: "SYSTEM",
        description: `Migration structure académique : ${membersLevels} membre(s) et ${cotLevels} type(s) corrigés (niveaux), ${membersFaculties} membre(s) et ${cotFaculties} type(s) corrigés (filières).`,
      },
    })
  }

  console.log("\nMigration terminée.\n")
}

main()
  .catch((e) => {
    console.error("migrate-academic failed:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
