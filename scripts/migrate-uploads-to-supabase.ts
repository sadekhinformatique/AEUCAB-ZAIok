/**
 * Migration des fichiers déjà téléversés vers Supabase Storage.
 *
 * 1. Parcourt `public/uploads/**` (ancien stockage local) et copie chaque
 *    fichier dans le bucket public « uploads » de Supabase, en conservant le
 *    même chemin relatif (ex. `announcements/2026-08/123.png`).
 * 2. Réécrit en base les références relatives `/uploads/…` des modèles
 *    suivants vers leur URL publique Supabase : Announcement (imageUrl,
 *    gallery, videoUrl, fileUrl), Document.fileUrl, LibraryResource.fileUrl,
 *    Archive.fileUrl.
 *
 * Idempotent : un fichier déjà présent dans Supabase n'est pas re-téléversé ;
 * une référence déjà absolue n'est pas modifiée. Aucune donnée supprimée.
 *
 * Usage : bun scripts/migrate-uploads-to-supabase.ts
 */
import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"
import { db } from "../src/lib/db"
import { STORAGE_BUCKET, storagePublicUrl } from "../src/lib/storage"

const rawUrl = process.env.SUPABASE_URL
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!rawUrl || !rawKey) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env")
  process.exit(1)
}
const url: string = rawUrl
const key: string = rawKey

const LOCAL_ROOT = path.join(process.cwd(), "public", "uploads")

async function* walk(dir: string): AsyncGenerator<string> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const full = path.join(dir, entry)
    const st = await stat(full)
    if (st.isDirectory()) yield* walk(full)
    else yield full
  }
}

async function main() {
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // 1) Upload des fichiers locaux
  let uploaded = 0, skipped = 0
  for await (const filePath of walk(LOCAL_ROOT)) {
    const rel = path.relative(LOCAL_ROOT, filePath).split(path.sep).join("/")
    const bytes = await readFile(filePath)

    const { error: existsError } = await supabase.storage.from(STORAGE_BUCKET).info(rel)
    if (!existsError) {
      skipped++ // déjà présent
      continue
    }
    const { error: upError } = await supabase.storage.from(STORAGE_BUCKET).upload(rel, bytes, {
      contentType: "application/octet-stream",
      upsert: false,
    })
    if (upError) {
      console.error(`  ÉCHEC ${rel}: ${upError.message}`)
      continue
    }
    uploaded++
    console.log(`  ↑ ${rel}`)
  }
  console.log(`\nFichiers locaux : ${uploaded} téléversés, ${skipped} déjà présents.`)

  // 2) Réécriture des références relatives en base
  const toAbs = (u: string | null | undefined) =>
    u && u.startsWith("/uploads/") ? storagePublicUrl(u) : u

  let updated = 0
  const announcements = await db.announcement.findMany({ select: { id: true, imageUrl: true, gallery: true, videoUrl: true, fileUrl: true } })
  for (const a of announcements) {
    const data: Record<string, unknown> = {}
    if (a.imageUrl && toAbs(a.imageUrl) !== a.imageUrl) data.imageUrl = toAbs(a.imageUrl)
    if (a.videoUrl && toAbs(a.videoUrl) !== a.videoUrl) data.videoUrl = toAbs(a.videoUrl)
    if (a.fileUrl && toAbs(a.fileUrl) !== a.fileUrl) data.fileUrl = toAbs(a.fileUrl)
    if (a.gallery) {
      try {
        const arr = JSON.parse(a.gallery) as string[]
        const next = arr.map(toAbs)
        if (JSON.stringify(next) !== JSON.stringify(arr)) data.gallery = JSON.stringify(next)
      } catch { /* laisser tel quel */ }
    }
    if (Object.keys(data).length) {
      await db.announcement.update({ where: { id: a.id }, data })
      updated++
      console.log(`  ↻ Announcement ${a.id}`)
    }
  }

  const docs = await db.document.findMany({ select: { id: true, fileUrl: true } })
  for (const d of docs) {
    if (d.fileUrl && toAbs(d.fileUrl) !== d.fileUrl) {
      await db.document.update({ where: { id: d.id }, data: { fileUrl: toAbs(d.fileUrl) } })
      updated++
    }
  }
  const lib = await db.libraryResource.findMany({ select: { id: true, fileUrl: true } })
  for (const l of lib) {
    if (l.fileUrl && toAbs(l.fileUrl) !== l.fileUrl) {
      await db.libraryResource.update({ where: { id: l.id }, data: { fileUrl: toAbs(l.fileUrl) } })
      updated++
    }
  }
  const archives = await db.archive.findMany({ select: { id: true, fileUrl: true } })
  for (const ar of archives) {
    if (ar.fileUrl && toAbs(ar.fileUrl) !== ar.fileUrl) {
      await db.archive.update({ where: { id: ar.id }, data: { fileUrl: toAbs(ar.fileUrl) } })
      updated++
    }
  }

  console.log(`Références en base réécrites : ${updated}.`)
  console.log("Terminé — aucune donnée supprimée.")
}

main().catch((e) => { console.error(e); process.exit(1) })
