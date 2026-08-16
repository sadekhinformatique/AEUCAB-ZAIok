/**
 * Setup du stockage Supabase — crée (si absent) le bucket public « uploads ».
 * Utilise la clé service role (côté serveur uniquement — jamais dans le frontend).
 *
 * Usage : bun scripts/setup-supabase-storage.ts
 */
import { createClient } from "@supabase/supabase-js"

const rawUrl = process.env.SUPABASE_URL
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!rawUrl || !rawKey) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env")
  process.exit(1)
}
const url: string = rawUrl
const key: string = rawKey

const BUCKET = "uploads"

async function main() {
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // 1) Le bucket existe-t-il déjà ?
  const { data: existing, error: listError } = await supabase.storage.listBuckets()
  if (listError) {
    // Le bucket peut exister mais l'appel échouer si la table storage est froide → relance 1x
    console.error("listBuckets:", listError.message)
    process.exit(1)
  }
  const found = existing?.find((b) => b.name === BUCKET)
  if (found) {
    console.log(`Bucket « ${BUCKET} » déjà présent (${found.public ? "public" : "privé"}).`)
    if (!found.public) {
      console.log("Passage en public…")
      await supabase.storage.updateBucket(BUCKET, { public: true })
      console.log("Bucket passé en public.")
    }
    return
  }

  // 2) Création
  const { data, error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 20 * 1024 * 1024, // 20 Mo — cohérent avec MAX_UPLOAD_BYTES
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
  })
  if (error) {
    console.error("createBucket:", error.message)
    process.exit(1)
  }
  console.log(`Bucket « ${BUCKET} » créé (public).`, data)
}

main()
