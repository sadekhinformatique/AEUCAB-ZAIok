/**
 * SGIAU — Couche de stockage des fichiers téléversés.
 *
 * Stockage hybride :
 *  - si `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` sont définis (Supabase —
 *    production comme dev), les fichiers sont stockés dans le bucket public
 *    « uploads » de Supabase Storage et servis via son CDN — durable et
 *    accessible depuis n'importe quel environnement (Vercel, local…) ;
 *  - sinon (auto-hébergement sans Supabase), les fichiers sont écrits sous
 *    `public/uploads/<dossier>/<année-mois>/` et servis par Next.js.
 *
 * Sécurité :
 *  - whitelist d'extensions (jamais d'exécutables, de scripts ou de HTML) ;
 *  - taille maximale (20 Mo) ;
 *  - nom de fichier régénéré (aléatoire) — aucun chemin utilisateur ;
 *  - les extensions sont vérifiées à partir du nom DU FICHIER (source fiable),
 *    le MIME déclaré n'étant pas fiable côté client.
 *
 * La clé service role reste strictement côté serveur — cette couche n'est
 * importée que par des routes API, jamais par le frontend.
 */

import { randomBytes } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20 Mo
export const STORAGE_BUCKET = "uploads"

/** Extensions autorisées → type affiché. */
export const ALLOWED_EXTENSIONS: Record<string, string> = {
  // Images
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".gif": "image",
  ".webp": "image",
  ".svg": "image",
  ".avif": "image",
  // Vidéos
  ".mp4": "video",
  ".webm": "video",
  ".mov": "video",
  ".m4v": "video",
  // Documents
  ".pdf": "document",
  ".doc": "document",
  ".docx": "document",
  ".xls": "document",
  ".xlsx": "document",
  ".ppt": "document",
  ".pptx": "document",
  ".txt": "document",
  ".csv": "document",
  // Audio
  ".mp3": "audio",
  ".wav": "audio",
}

export interface UploadMeta {
  url: string
  name: string
  type: string // image | video | document | audio | inconnu
  size: number
  extension: string
}

export function uploadError(ext: string | null, size: number): string | null {
  if (!ext || !ALLOWED_EXTENSIONS[ext.toLowerCase()]) {
    return "Type de fichier non autorisé (images, vidéos, PDF, Office, texte — pas d'exécutables ni de scripts)"
  }
  if (size <= 0) return "Fichier vide"
  if (size > MAX_UPLOAD_BYTES) {
    return `Fichier trop volumineux (maximum ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} Mo)`
  }
  return null
}

/** Client Supabase Storage (service role) — singleton paresseux, serveur uniquement. */
let storageClient: SupabaseClient | null = null
export function getStorageClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  if (!storageClient) {
    storageClient = createClient(url, key, { auth: { persistSession: false } })
  }
  return storageClient
}

/** URL publique d'un objet du bucket « uploads ». */
export function storagePublicUrl(pathname: string): string {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "")
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${pathname.replace(/^\/+/, "")}`
}

/**
 * Résout une URL stockée (éventuellement un chemin relatif `/uploads/…`
 * hérité de l'ancien stockage local) vers une URL absolue accessible.
 * Les URL déjà absolues (Supabase, externe) sont renvoyées telles quelles.
 */
export function resolveStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith("/uploads/")) {
    if (getStorageClient()) return storagePublicUrl(url)
    return url // repli local : le chemin relatif est servi par Next.js
  }
  return url
}

/**
 * Enregistre un fichier (Buffer) dans Supabase Storage (ou `public/uploads/`
 * en repli local) et renvoie ses métadonnées.
 * @param file - objet File (Web API) envoyé en multipart.
 * @param folder - sous-dossier : "announcements" | "teams" | "documents"…
 * @throws Error avec un message utilisateur si le fichier est refusé.
 */
export async function saveUploadFile(file: File, folder = "general"): Promise<UploadMeta> {
  const bytes = Buffer.from(await file.arrayBuffer())
  const originalName = (file.name ?? "fichier").replace(/[\\/]/g, "-").trim() || "fichier"
  const ext = path.extname(originalName).toLowerCase()

  const error = uploadError(ext, bytes.length)
  if (error) throw new Error(error)

  const safeFolder = folder.replace(/[^a-z0-9-_]/gi, "").toLowerCase() || "general"
  const stamp = new Date()
  const subdir = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, "0")}`
  const random = randomBytes(8).toString("hex")
  const storedName = `${Date.now()}-${random}${ext}`
  const pathname = `${safeFolder}/${subdir}/${storedName}`

  // ——— Supabase Storage (bucket public « uploads ») ———
  const client = getStorageClient()
  if (client) {
    const { error: upError } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(pathname, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })
    if (upError) throw new Error(`Enregistrement du fichier impossible (${upError.message})`)
    return {
      url: storagePublicUrl(pathname),
      name: originalName,
      type: ALLOWED_EXTENSIONS[ext] ?? "inconnu",
      size: bytes.length,
      extension: ext,
    }
  }

  // ——— Filesystem local (auto-hébergement sans Supabase) ———
  const dir = path.join(process.cwd(), "public", "uploads", safeFolder, subdir)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, storedName), bytes)

  return {
    url: `/uploads/${pathname}`,
    name: originalName,
    type: ALLOWED_EXTENSIONS[ext] ?? "inconnu",
    size: bytes.length,
    extension: ext,
  }
}
