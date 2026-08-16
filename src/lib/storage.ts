/**
 * SGIAU — Couche de stockage des fichiers téléversés.
 *
 * Stockage hybride :
 *  - si `BLOB_READ_WRITE_TOKEN` est défini (Vercel Blob, production),
 *    les fichiers sont stockés dans le Blob Store de Vercel et servis via
 *    son CDN — le filesystem serverless étant éphémère et en lecture seule ;
 *  - sinon (dev / auto-hébergement), les fichiers sont écrits sous
 *    `public/uploads/<dossier>/<année-mois>/` et servis par Next.js.
 *
 * Sécurité :
 *  - whitelist d'extensions (jamais d'exécutables, de scripts ou de HTML) ;
 *  - taille maximale (par défaut 20 Mo) ;
 *  - nom de fichier régénéré (aléatoire) — aucun chemin utilisateur ;
 *  - les extensions sont vérifiées à partir du nom DU FICHIER (source fiable),
 *    le MIME déclaré n'étant pas fiable côté client.
 */

import { randomBytes } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { put } from "@vercel/blob"

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20 Mo

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

/**
 * Enregistre un fichier (Buffer) sous `public/uploads/...` et renvoie ses métadonnées.
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
  const pathname = `/uploads/${safeFolder}/${subdir}/${storedName}`

  // ——— Vercel Blob (production) ———
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(pathname, bytes, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/octet-stream",
    })
    return {
      url: blob.url,
      name: originalName,
      type: ALLOWED_EXTENSIONS[ext] ?? "inconnu",
      size: bytes.length,
      extension: ext,
    }
  }

  // ——— Filesystem local (dev / auto-hébergement) ———
  const dir = path.join(process.cwd(), "public", "uploads", safeFolder, subdir)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, storedName), bytes)

  return {
    url: pathname,
    name: originalName,
    type: ALLOWED_EXTENSIONS[ext] ?? "inconnu",
    size: bytes.length,
    extension: ext,
  }
}
