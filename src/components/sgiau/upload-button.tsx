"use client"

import { useRef, useState } from "react"
import { UploadCloud, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { UploadMeta } from "@/lib/storage"

/**
 * Bouton de téléversement réutilisable — publications (actualités), pièces
 * jointes d'équipes, documents…
 * Envoie le fichier à /api/upload puis appelle `onUploaded` avec les métadonnées.
 */
export function FileUploadButton({
  folder,
  accept,
  label = "Téléverser un fichier",
  className,
  size = "sm",
  onUploaded,
}: {
  folder: string
  accept: string
  label?: string
  className?: string
  size?: "sm" | "default" | "icon"
  onUploaded: (meta: UploadMeta) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", folder)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Téléversement échoué")
      toast.success(`« ${data.name} » téléversé`)
      onUploaded(data as UploadMeta)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        size={size}
        className={className}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        {busy ? "Téléversement…" : label}
      </Button>
    </>
  )
}

export function fileAcceptByType(type: "image" | "video" | "document"): string {
  if (type === "image") return "image/*"
  if (type === "video") return "video/*"
  return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
}
