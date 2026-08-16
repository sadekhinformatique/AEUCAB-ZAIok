/**
 * Sauvegarde complète de la base Neon (lecture seule) :
 *  - DDL du schéma actuel (prisma migrate diff --from-empty --to-url)
 *  - données de chaque table en JSON
 *  - inventaire des comptages
 * Écrit dans backups/neon-<horodatage>/. Supprimer après migration validée.
 */
import { execSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { db } from "@/lib/db"

const TS = new Date().toISOString().replace(/[:.]/g, "-")
const DIR = `backups/neon-${TS}`
mkdirSync(DIR, { recursive: true })
const dataDir = `${DIR}/data`
mkdirSync(dataDir, { recursive: true })

async function main() {
  console.log(`\n── Backup Neon → ${DIR} ──────────────────────────────`)

  // 1) DDL du schéma (prisma CLI charge .env lui-même)
  try {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL absente")
    const ddl = execSync(
      `npx prisma migrate diff --from-empty --to-url "${url}" --script`,
      { env: { ...process.env, DATABASE_URL: url }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    )
    writeFileSync(`${DIR}/schema.sql`, ddl)
    console.log(`✔ schéma DDL → ${DIR}/schema.sql (${ddl.length} octets)`)
  } catch (e) {
    console.error("✘ DDL échoué :", String((e as Error).message).split("\n").slice(0, 3).join(" | "))
  }

  // 2) Données par table (SELECT * brut)
  const tables = await db.$queryRaw<{ name: string }[]>`
    SELECT table_name AS name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`

  let total = 0
  const inventory: Record<string, number> = {}
  for (const t of tables) {
    const rows = await db.$queryRawUnsafe(`SELECT * FROM "${t.name}"`) as unknown[]
    inventory[t.name] = rows.length
    total += rows.length
    if (rows.length > 0) {
      writeFileSync(`${dataDir}/${t.name}.json`, JSON.stringify(rows, null, 2))
    }
  }
  writeFileSync(`${DIR}/inventory.json`, JSON.stringify({ tables: tables.length, total, inventory }, null, 2))
  console.log(`✔ ${tables.length} tables inventoriées — ${total} lignes`)
  console.log("  Tables non vides :", Object.entries(inventory).filter(([, c]) => c > 0).map(([t, c]) => `${t}=${c}`).join(", "))
}

main()
  .catch((e) => { console.error("Backup échoué :", String((e as Error).message).split("\n")[0]); process.exit(1) })
  .finally(() => db.$disconnect())
