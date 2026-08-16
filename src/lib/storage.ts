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

/**
 * Options du bucket public « uploads » — source unique partagée avec
 * scripts/setup-supabase-storage.ts (création automatique au 1er upload).
 */
export const STORAGE_BUCKET_OPTIONS: {
  public: boolean
  fileSizeLimit: number
  allowedMimeTypes: string[]
} = {
  public: true,
  fileSizeLimit: MAX_UPLOAD_BYTES, // 20 Mo — cohérent avec uploadError
  allowedMimeTypes: [
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif",
    "video/mp4", "video/webm", "video/quicktime", "video/x-m4v",
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain", "text/csv",
    "audio/mpeg", "audio/wav",
  ],
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

/** Cache : le bucket « uploads » a déjà été vérifié/créé pour cette instance. */
let bucketReady: boolean | null = null

/** Messages d'erreur typiques d'une clé sans droit storage.admin (RLS, anon…). */
const PERMISSION_HINT = /permission|row-level security|forbidden|denied|not allowed|unauthor/i

function storageSetupError(e: { message?: string } | null): Error {
  const msg = e?.message ?? "erreur inconnue"
  if (PERMISSION_HINT.test(msg)) {
    return new Error(
      `Stockage Supabase inaccessible : la clé SUPABASE_SERVICE_ROLE_KEY n'a pas les droits nécessaires (storage.admin) pour créer le bucket public « ${STORAGE_BUCKET} » (${msg})`
    )
  }
  return new Error(`Préparation du stockage Supabase impossible (${msg})`)
}

/**
 * Garantit que le bucket public « uploads » existe — créé automatiquement au
 * premier upload (vérification mise en cache par instance), comme le ferait
 * scripts/setup-supabase-storage.ts. Ne renvoie rien si Supabase n'est pas
 * configuré (repli local) ; lève une erreur utilisateur claire si la clé
 * service role n'a pas les droits nécessaires.
 */
export async function ensureStorageBucket(): Promise<void> {
  if (bucketReady) return
  const client = getStorageClient()
  if (!client) return // repli local — le caller décide

  const { data: buckets, error: listError } = await client.storage.listBuckets()
  if (listError) throw storageSetupError(listError)

  const existing = buckets?.find((b) => b.name === STORAGE_BUCKET)
  if (existing) {
    // Bucket présent mais privé → passage en public (idempotent).
    if (!existing.public) {
      const { error: updError } = await client.storage.updateBucket(STORAGE_BUCKET, { public: true })
      if (updError) throw storageSetupError(updError)
    }
    bucketReady = true
    return
  }

  const { error: createError } = await client.storage.createBucket(STORAGE_BUCKET, STORAGE_BUCKET_OPTIONS)
  if (createError) {
    // Une autre requête a pu créer le bucket entre-temps → dernière vérification.
    const { data: re } = await client.storage.listBuckets()
    if (re?.some((b) => b.name === STORAGE_BUCKET)) {
      bucketReady = true
      return
    }
    throw storageSetupError(createError)
  }
  bucketReady = true
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
 * Résout chaque URL d'un tableau JSON d'URLs (ex. `photoUrls`, `gallery`).
 * Préserve le format stocké (chaîne JSON) pour ne pas casser le frontend.
 */
export function resolveUrlArray(json: string | null | undefined): string | null {
  if (!json) return null
  try {
    const parsed: unknown = JSON.parse(json)
    if (!Array.isArray(parsed)) return json
    return JSON.stringify(parsed.map((u) => resolveStorageUrl(typeof u === "string" ? u : null)))
  } catch {
    return json
  }
}

/**
 * Résout la propriété `url` de chaque objet d'un tableau JSON
 * (ex. `attachments` : [{ url, name, type, size }]). Préserve le format stocké.
 */
export function resolveUrlObjects(json: string | null | undefined): string | null {
  if (!json) return null
  try {
    const parsed: unknown = JSON.parse(json)
    if (!Array.isArray(parsed)) return json
    return JSON.stringify(
      parsed.map((o) => {
        if (o && typeof o === "object" && "url" in (o as Record<string, unknown>)) {
          return { ...(o as Record<string, unknown>), url: resolveStorageUrl(String((o as Record<string, unknown>).url)) }
        }
        return o
      })
    )
  } catch {
    return json
  }
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
    await ensureStorageBucket()
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
  // Sur Vercel (Lambda), le filesystem est en lecture seule : le repli local
  // est impossible, on échoue avec un message explicite plutôt qu'un ENOENT.
  if (process.env.VERCEL) {
    throw new Error(
      "Stockage Supabase non configuré — définissez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans les variables d'environnement du déploiement"
    )
  }
  const dir = path.join(process.cwd(), "public", "uploads", safeFolder, subdir)
  try {
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, storedName), bytes)
  } catch (e) {
    throw new Error(
      `Stockage local indisponible (${(e as NodeJS.ErrnoException).code ?? "erreur"}) — définissez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY pour activer le stockage Supabase`
    )
  }

  return {
    url: `/uploads/${pathname}`,
    name: originalName,
    type: ALLOWED_EXTENSIONS[ext] ?? "inconnu",
    size: bytes.length,
    extension: ext,
  }
}
