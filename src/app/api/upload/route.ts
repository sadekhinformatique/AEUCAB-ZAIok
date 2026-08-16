import { NextRequest } from "next/server"
import { ok, err, audit, getCurrentUserId } from "@/lib/sgiau/api"
import { saveUploadFile, type UploadMeta } from "@/lib/storage"

export const dynamic = "force-dynamic"

/**
 * Téléversement de fichier — image, vidéo, PDF…
 * Requiert une session valide (le middleware bloque déjà les anonymes).
 * Body : multipart/form-data avec un champ `file` et un champ optionnel `folder`.
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return err("Non authentifié", 401)

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return err("Corps de requête invalide", 400)
  }

  const file = form.get("file")
  if (!(file instanceof File)) return err("Aucun fichier reçu (champ « file »)", 422)

  const folder = (form.get("folder")?.toString() ?? "general").trim()
  let meta: UploadMeta
  try {
    meta = await saveUploadFile(file, folder)
  } catch (e) {
    return err((e as Error).message || "Fichier refusé", 422)
  }

  // Journalisation — ne doit JAMAIS faire échouer un upload (base indisponible…)
  try {
    await audit({
      userId,
      action: "UPLOAD",
      entity: "File",
      entityId: meta.url,
      after: meta,
      description: `Téléversement ${meta.type} « ${meta.name} » (${Math.round(meta.size / 1024)} Ko) → ${meta.url}`,
    })
  } catch (e) {
    console.error("upload: audit impossible, fichier conservé", (e as Error).message)
  }

  return ok(meta, 201)
}
