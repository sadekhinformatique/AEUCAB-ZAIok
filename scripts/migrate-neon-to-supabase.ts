/**
 * Migration des données Neon → Supabase (préservation intégrale des IDs).
 *
 * - Source  : base Neon (client Prisma existant, .env)
 * - Cible   : Supabase (pooler eu-west-2, URL fournie en SUPABASE_DATABASE_URL)
 * - Ordre   : topologique sur les relations Prisma (parents d'abord)
 * - Colonnes: intersection source ∩ cible (les colonnes nouvelles prennent leurs défauts)
 * - Idempotent : DELETE de la table cible avant insertion
 *
 * Usage : SUPABASE_DATABASE_URL='...' bun scripts/migrate-neon-to-supabase.ts
 */
import { readFileSync } from "node:fs"
import { PrismaClient, Prisma } from "@prisma/client"
import dns from "node:dns/promises"

const SUPABASE_HOST = "aws-0-eu-west-2.pooler.supabase.com"
const SUPABASE_REF = "eycbwcujeylppnfjeqvf"
const SUPABASE_PASSWORD = process.env.SUPABASE_DB_PASSWORD

function need(v: string | undefined, msg: string): string {
  if (!v) throw new Error(msg)
  return v
}

/** URL Neon lue dans .env, avec timeouts de pool étendus pour le démarrage à froid. */
function neonUrlWithTimeout(): string {
  const env = readFileSync(".env", "utf8")
  const m = env.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)/m)
  if (!m) throw new Error("DATABASE_URL introuvable dans .env")
  let url = m[1].trim()
  url = url.replace(/connect_timeout=\d+/, "connect_timeout=90")
  if (!/connect_timeout/.test(url)) url += `${url.includes("?") ? "&" : "?"}connect_timeout=90`
  if (!/pool_timeout/i.test(url)) url += `&pool_timeout=120000&connection_limit=2`
  return url
}

/** Relance une requête source jusqu'à succès (Neon se réveille après 10-60 s). */
async function qSrc<T>(fn: () => Promise<T>, tries = 12, delayMs = 12000): Promise<T> {
  let last: unknown
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw last instanceof Error ? last : new Error(String(last))
}

/** Ordre topologique des modèles (parents avant enfants) à partir du DMMF. */
function topoOrder(): string[] {
  const models = Prisma.dmmf.datamodel.models as unknown as { name: string; fields: { name: string; kind: string; type: string; relationFromFields?: string[] }[] }[]
  const deps = new Map<string, Set<string>>()
  for (const m of models) {
    const set = new Set<string>()
    for (const f of m.fields) {
      if (f.kind === "object" && (f.relationFromFields?.length ?? 0) > 0) {
        set.add(f.type) // ce modèle dépend de f.type (FK)
      }
    }
    deps.set(m.name, set)
  }
  // Kahn
  const order: string[] = []
  const remaining = new Set(deps.keys())
  while (remaining.size) {
    const ready = [...remaining].filter((m) => [...deps.get(m)!].every((d) => !remaining.has(d)))
    if (!ready.length) {
      // cycle : défausser le premier restant (rare ; les FK restantes sont NULL-ables)
      const [m] = remaining
      remaining.delete(m)
      order.push(m)
      console.warn(`  ⚠ cycle détecté autour de ${m} — ordre forcé`)
      continue
    }
    for (const m of ready.sort()) { remaining.delete(m); order.push(m) }
  }
  return order
}

async function main() {
  const password = need(SUPABASE_PASSWORD, "SUPABASE_DB_PASSWORD manquante")
  const targetUrlBase = `postgresql://postgres.${SUPABASE_REF}:${encodeURIComponent(password)}@`

  // Résolution IP (DNS local instable → retries)
  let ip = ""
  for (let i = 0; i < 5 && !ip; i++) {
    try { ip = (await dns.lookup(SUPABASE_HOST, { family: 4 })).address } catch { await new Promise((r) => setTimeout(r, 1500)) }
  }
  if (!ip) throw new Error(`Résolution DNS impossible pour ${SUPABASE_HOST}`)
  const targetUrl = `${targetUrlBase}${ip}:6543/postgres?pgbouncer=true&connection_limit=5`
  console.log(`Cible Supabase : ${SUPABASE_HOST} → ${ip}`)

  const source = new PrismaClient({ datasources: { db: { url: neonUrlWithTimeout() } } })
  const p = new PrismaClient({ datasources: { db: { url: targetUrl } } })

  try {
    // Tables sources (Neon) avec colonnes réelles (avec relance automatique)
    const srcTables = await qSrc(() => source.$queryRaw<{ name: string; cols: string[] }[]>`
      SELECT t.table_name::text AS name,
             (SELECT array_agg(c.column_name::text ORDER BY c.ordinal_position)
              FROM information_schema.columns c
              WHERE c.table_schema='public' AND c.table_name=t.table_name) AS cols
      FROM information_schema.tables t
      WHERE t.table_schema='public' AND t.table_type='BASE TABLE'`)

    // Colonnes cibles (Supabase) avec leur type (pour les casts)
    const dstCols = new Map<string, Set<string>>()
    const dstTypes = new Map<string, Map<string, string>>()
    const dstTables = await p.$queryRaw<{ name: string; col: string; udt: string }[]>`
      SELECT table_name::text AS name, column_name::text AS col, udt_name::text AS udt
      FROM information_schema.columns WHERE table_schema='public'`
    for (const r of dstTables) {
      if (!dstCols.has(r.name)) dstCols.set(r.name, new Set())
      dstCols.get(r.name)!.add(r.col)
      if (!dstTypes.has(r.name)) dstTypes.set(r.name, new Map())
      dstTypes.get(r.name)!.set(r.col, r.udt)
    }

    const order = topoOrder()
    const byName = new Map(srcTables.map((t) => [t.name, t]))
    const tables = order.filter((m) => byName.has(m) && (byName.get(m)!.cols?.length ?? 0) > 0)

    console.log(`\n── Migration : ${tables.length} tables (ordre topologique) ────────`)
    const report: Record<string, { src: number; dst: number }> = {}
    let total = 0

    for (const table of tables) {
      const srcCols = (byName.get(table)!.cols ?? [])
      const cols = srcCols.filter((c) => dstCols.get(table)?.has(c))
      if (!cols.length) {
        console.log(`  ⚠ ${table} : aucune colonne commune, ignoré`)
        continue
      }
      const rows = await qSrc(() => source.$queryRawUnsafe<{ r: Record<string, unknown> }[]>(`SELECT row_to_json(t) AS r FROM "${table}" t`))
      if (!rows.length) {
        report[table] = { src: 0, dst: 0 }
        continue
      }

      await p.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`DELETE FROM "${table}"`)
        const colList = cols.map((c) => `"${c}"`).join(", ")
        const types = dstTypes.get(table) ?? new Map<string, string>()
        const placeholders = cols.map((c, i) => {
          const udt = types.get(c)
          const cast = udt && !["text", "varchar", "bpchar", "name"].includes(udt) ? `::${udt}` : ""
          return `$${i + 1}${cast}`
        }).join(", ")
        const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`
        for (const row of rows) {
          const values = cols.map((c) => {
            const v = row.r[c]
            if (v === null || v === undefined) return null
            if (typeof v === "object") return JSON.stringify(v)
            return v as string | number | boolean
          })
          await tx.$executeRawUnsafe(sql, ...values)
        }
      }, { timeout: 120000 })
      report[table] = { src: rows.length, dst: rows.length }
      total += rows.length
      console.log(`  ✔ ${table} : ${rows.length} ligne(s)`)
    }

    // Vérification finale : comptages source vs cible
    console.log(`\n── Vérification finale ───────────────────────────────`)
    const srcCounts = new Map<string, number>()
    for (const t of srcTables) {
      const [{ c }] = await qSrc(() => source.$queryRawUnsafe<{ c: bigint }[]>(`SELECT count(*) AS c FROM "${t.name}"`))
      srcCounts.set(t.name, Number(c))
    }
    let ok = true
    for (const [table, { src, dst }] of Object.entries(report)) {
      const cur = await p.$queryRawUnsafe<{ c: bigint }[]>(`SELECT count(*) AS c FROM "${table}"`)
      const curN = Number(cur[0].c)
      const match = curN === src
      if (!match) ok = false
      console.log(`  ${match ? "✔" : "✘"} ${table} : source=${src} cible=${curN}`)
    }
    // Tables vides des deux côtés
    for (const t of srcTables) {
      if (!report[t.name] && srcCounts.get(t.name) === 0) {
        console.log(`  ✔ ${t.name} : 0 (vide)`)
      }
    }
    console.log(`\nTotal lignes transférées : ${total} — ${ok ? "TOUT EST CONFORME ✅" : "ÉCARTS DÉTECTÉS ❌"}`)
    if (!ok) process.exitCode = 1
  } finally {
    await p.$disconnect().catch(() => {})
    await source.$disconnect().catch(() => {})
  }
}

main().catch((e) => {
  console.error("\n===== ERREUR COMPLÈTE =====")
  console.error(String((e as Error).message))
  console.error("\nSTACK :")
  console.error(String((e as Error).stack ?? "").split("\n").slice(0, 6).join("\n"))
  process.exit(1)
})
