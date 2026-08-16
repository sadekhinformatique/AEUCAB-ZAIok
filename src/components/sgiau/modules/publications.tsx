"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Megaphone, Plus, Pencil, Trash2, Pin, Bell, Image as ImageIcon, Video, FileText,
  Link2, Eye, Search,
} from "lucide-react"
import { PageHeader, StatCard, SectionCard, EmptyState, LoadingState } from "@/components/sgiau/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { formatDate, formatDateTime } from "@/lib/sgiau/format"
import { FileUploadButton, fileAcceptByType } from "@/components/sgiau/upload-button"

interface Publication {
  id: string
  title: string
  body: string
  audience: string
  category: string
  imageUrl: string | null
  gallery: string | null
  videoUrl: string | null
  fileUrl: string | null
  fileName: string | null
  linkUrl: string | null
  pinned: boolean
  notify: boolean
  publishedAt: string
  expiresAt: string | null
}

const CATEGORY_LABELS: Record<string, { label: string; cls: string }> = {
  GENERAL: { label: "Générale", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  COTISATION: { label: "Cotisations", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  SPORT: { label: "Sport", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  ACTIVITY: { label: "Activité", cls: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200" },
  INFO: { label: "Information", cls: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200" },
}

const AUDIENCE_LABELS: Record<string, string> = {
  ALL: "Tous",
  MEMBERS: "Membres",
  STAFF: "Personnel (SAS)",
}

const EMPTY_FORM = {
  title: "",
  body: "",
  audience: "ALL",
  category: "GENERAL",
  imageUrl: "",
  videoUrl: "",
  fileUrl: "",
  fileName: "",
  linkUrl: "",
  pinned: false,
  notify: false,
}

export default function PublicationsModule() {
  const [items, setItems] = useState<Publication[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Publication | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<Publication | null>(null)

  const load = useCallback(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Impossible de charger les publications"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter((a) =>
    !q || a.title.toLowerCase().includes(q.toLowerCase()) || a.body.toLowerCase().includes(q.toLowerCase())
  )
  const pinnedCount = items.filter((a) => a.pinned).length
  const notifyCount = items.filter((a) => a.notify).length

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  function openEdit(p: Publication) {
    setEditing(p)
    setForm({
      title: p.title,
      body: p.body,
      audience: p.audience,
      category: p.category,
      imageUrl: p.imageUrl ?? "",
      videoUrl: p.videoUrl ?? "",
      fileUrl: p.fileUrl ?? "",
      fileName: p.fileName ?? "",
      linkUrl: p.linkUrl ?? "",
      pinned: p.pinned,
      notify: p.notify,
    })
    setOpen(true)
  }

  async function save() {
    if (!form.title.trim()) { toast.error("Le titre est requis"); return }
    if (!form.body.trim()) { toast.error("Le contenu est requis"); return }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/announcements/${editing.id}` : "/api/announcements", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur")
      toast.success(editing ? "Publication mise à jour" : "Publication diffusée vers l'application étudiante")
      setOpen(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(p: Publication) {
    if (!confirm(`Supprimer la publication « ${p.title} » ?`)) return
    const res = await fetch(`/api/announcements/${p.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { toast.success("Publication supprimée"); load() }
    else toast.error(data?.error || "Échec de la suppression")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publications & actualités"
        description="Centre de diffusion des informations de l'Amicale — SAS → publication → API → application étudiante → notification"
        icon={Megaphone}
        actions={
          <Button size="sm" className="gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" /> Nouvelle publication
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Publications" value={loading ? "…" : items.length} icon={Megaphone} loading={loading} />
        <StatCard title="Épinglées" value={loading ? "…" : pinnedCount} icon={Pin} tone="warning" loading={loading} />
        <StatCard title="Avec notification" value={loading ? "…" : notifyCount} icon={Bell} tone="info" loading={loading} hint="Diffusion automatique aux membres" />
        <StatCard title="Contenus média" value={loading ? "…" : items.filter((a) => a.imageUrl || a.gallery || a.videoUrl || a.fileUrl).length} icon={ImageIcon} tone="success" loading={loading} />
      </div>

      <SectionCard title="Publications" description="Texte, images, vidéo, PDF, liens — visibles immédiatement dans l'application étudiante.">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher une publication…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {loading ? (
          <LoadingState rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Aucune publication"
            description="Publiez une annonce, une information sportive ou un rappel de cotisation — elle apparaîtra dans l'application étudiante."
            action={<Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle publication</Button>}
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Publication</TableHead>
                  <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                  <TableHead className="hidden lg:table-cell">Média</TableHead>
                  <TableHead className="hidden md:table-cell">Diffusion</TableHead>
                  <TableHead className="hidden lg:table-cell">Publiée le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {a.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-primary" />}
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[260px]">{a.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-[260px]">{a.body}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className={CATEGORY_LABELS[a.category]?.cls}>{CATEGORY_LABELS[a.category]?.label ?? a.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex gap-1">
                        {a.imageUrl && <Badge variant="outline" className="text-[9px] gap-1"><ImageIcon className="h-3 w-3" /> Image</Badge>}
                        {a.gallery && <Badge variant="outline" className="text-[9px] gap-1"><ImageIcon className="h-3 w-3" /> Galerie</Badge>}
                        {a.videoUrl && <Badge variant="outline" className="text-[9px] gap-1"><Video className="h-3 w-3" /> Vidéo</Badge>}
                        {a.fileUrl && <Badge variant="outline" className="text-[9px] gap-1"><FileText className="h-3 w-3" /> Fichier</Badge>}
                        {a.linkUrl && <Badge variant="outline" className="text-[9px] gap-1"><Link2 className="h-3 w-3" /> Lien</Badge>}
                        {!a.imageUrl && !a.gallery && !a.videoUrl && !a.fileUrl && !a.linkUrl && <span className="text-xs text-muted-foreground">Texte</span>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit text-[9px]">{AUDIENCE_LABELS[a.audience] ?? a.audience}</Badge>
                        {a.notify && <Badge variant="outline" className="w-fit text-[9px] bg-amber-50 text-amber-700 border-amber-200 gap-1"><Bell className="h-3 w-3" /> Notification</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDate(a.publishedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Aperçu" onClick={() => setPreview(a)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(a)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Dialogue édition */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la publication" : "Nouvelle publication"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre de l'annonce" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Contenu *</Label>
              <Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Texte de la publication…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Audience</Label>
                <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(AUDIENCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Image principale</Label>
              <div className="flex gap-2">
                <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="URL externe ou /uploads/…" />
                <FileUploadButton folder="announcements" accept={fileAcceptByType("image")} label="Image" className="shrink-0" onUploaded={(m) => setForm({ ...form, imageUrl: m.url })} />
              </div>
              {form.imageUrl && <img src={form.imageUrl} alt="" className="h-28 w-full rounded-lg border object-cover" />}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5"><Video className="h-3.5 w-3.5" /> Vidéo</Label>
              <div className="flex gap-2">
                <Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="URL externe ou /uploads/…" />
                <FileUploadButton folder="announcements" accept={fileAcceptByType("video")} label="Vidéo" className="shrink-0" onUploaded={(m) => setForm({ ...form, videoUrl: m.url })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Fichier / PDF</Label>
                <div className="flex gap-2">
                  <Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value, fileName: form.fileName || e.target.value.split("/").pop() || "" })} placeholder="URL externe ou /uploads/…" />
                  <FileUploadButton folder="announcements" accept={fileAcceptByType("document")} label="Fichier" className="shrink-0" onUploaded={(m) => setForm({ ...form, fileUrl: m.url, fileName: m.name })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nom du fichier</Label>
                <Input value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} placeholder="Reglement-sportive.pdf" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Lien externe</Label>
              <Input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://…" />
            </div>
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="h-4 w-4 rounded border-input" />
                <Pin className="h-3.5 w-3.5" /> Épingler en tête de la page Actualités
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input type="checkbox" checked={form.notify} onChange={(e) => setForm({ ...form, notify: e.target.checked })} className="h-4 w-4 rounded border-input" />
                <Bell className="h-3.5 w-3.5" /> Diffuser une notification à tous les membres
              </label>
              {form.notify && (
                <p className="text-[11px] text-muted-foreground pl-6">SAS → publication → API → application → notification automatique.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Publication…" : editing ? "Mettre à jour" : "Publier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aperçu */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={CATEGORY_LABELS[preview.category]?.cls}>{CATEGORY_LABELS[preview.category]?.label ?? preview.category}</Badge>
                <Badge variant="outline" className="text-[9px]">{AUDIENCE_LABELS[preview.audience] ?? preview.audience}</Badge>
                <span className="text-[10px] text-muted-foreground">{formatDateTime(preview.publishedAt)}</span>
              </div>
              {preview.imageUrl && <img src={preview.imageUrl} alt="" className="w-full rounded-lg border object-cover" />}
              <p className="text-sm whitespace-pre-wrap">{preview.body}</p>
              {preview.videoUrl && (
                <video src={preview.videoUrl} controls className="w-full rounded-lg border" />
              )}
              {preview.fileUrl && (
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href={preview.fileUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4" /> {preview.fileName || "Ouvrir le document"}
                  </a>
                </Button>
              )}
              {preview.linkUrl && (
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href={preview.linkUrl} target="_blank" rel="noopener noreferrer">
                    <Link2 className="h-4 w-4" /> Ouvrir le lien
                  </a>
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
